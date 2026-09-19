# Audit automatisé — ERC7943Adapter

**Ce document n'est pas un audit professionnel independant.** Il rend
compte d'une chaine d'outils d'analyse automatisee (statique, fuzzing) et
de sa triage manuelle. Aucun cabinet d'audit externe n'a revu ce code.
**Ne pas deployer sur mainnet avec des actifs reels sur la seule base de ce
document** — voir [docs/guide-institutions.md](../docs/guide-institutions.md#5-etat-du-brouillon-erc7943-et-surface-de-risque).

Perimetre : `contracts/adapters/ERC7943Adapter.sol` et `IERC7943.sol`
(~140 lignes). La suite T-REX vendorisee (`contracts/` hors `adapters/`)
n'est pas dans le perimetre — c'est le code de reference Tokeny, deja
audite separement (voir `backend/README.TREX.md`).

Date : 2026-09-19. Commit : voir `git log -1 -- contracts/adapters/`.

## Outils executes

| Outil | Type | Resultat |
|---|---|---|
| [Slither](https://github.com/crytic/slither) 0.11.x | Analyse statique (AST, Python) | 4 findings → 2 corriges, 2 acceptes |
| [Aderyn](https://github.com/Cyfrin/aderyn) 0.6.8 | Analyse statique (AST, Rust) | 2 findings → 2 corriges |
| [Semgrep](https://semgrep.dev) `p/smart-contracts` | Pattern-matching (post-mortems DeFi) | 0 finding de securite, 3 notes de gas |
| `forge lint` (Foundry) | Analyse statique (style/securite) | 0 a `high`/`med`, 7 notes de style |
| Foundry fuzzing (natif) | Property-based testing | 7 proprietes, 256 runs chacune, 0 echec |
| Certora, Halmos, Gambit | Formel / symbolique / mutation | Non executes — voir §Limites |

## Findings reels, corriges

### 1. Retour de `forcedTransfer` non verifie (Slither `unused-return`)

**Avant** :
```solidity
token.forcedTransfer(from, to, amount);
emit ForcedTransfer(from, to, 0, amount);
```

`IERC3643Minimal.forcedTransfer` declare `returns (bool)`. T-REX
(`Token.sol`) ne renvoie jamais `false` — il revert sur tout echec — mais
l'adaptateur cible generiquement l'interface `IERC3643Minimal`, pas
specifiquement T-REX. Un autre token ERC-3643 conforme a l'interface mais
utilisant un pattern retour-false-sans-revert (a la ERC-20 historique type
USDT) aurait fait emettre `ForcedTransfer` **alors que le transfert avait
echoue** — exactement le "echec silencieux" que l'adaptateur s'interdit
explicitement ailleurs (role d'agent, voir le commentaire de conception du
contrat).

**Apres** :
```solidity
if (!token.forcedTransfer(from, to, amount)) revert ForcedTransferFailed();
emit ForcedTransfer(from, to, 0, amount);
```

Couvert par un test de fuzzing dedie
(`testFuzz_forcedTransfer_revertsWhenUnderlyingReturnsFalse`, 256 runs).

### 2. Erreur `AdapterIsNotAgent` declaree mais jamais levee (Aderyn `L-1`)

Code mort : le controle d'acces reel se fait naturellement quand
l'adaptateur appelle `token.freezePartialTokens`/`forcedTransfer`, qui
revert eux-memes via le modifier `onlyAgent` du token si le role manque.
Cette erreur locale n'etait jamais utilisee. Supprimee.

### 3. `getFrozenTokens` visibilite `public` au lieu d'`external` (Aderyn `L-2`)

Jamais appelee en interne par l'adaptateur (contrairement a `canSend` et
`canReceive`, utilisees par `canTransfer`). Passee en `external` — cout de
calldata legerement reduit, aucun changement de comportement.

### 4. Statement mort `amount;` (Slither `redundant-statements`)

Ligne laissee dans `canReceive` pour reference le parametre `amount`
inutilise. Solidity ne genere pas d'avertissement pour un parametre
externe non utilise (contrairement a une variable locale) : le statement
etait purement cosmetique. Retire ; le parametre est maintenant anonyme
(`uint256 /* amount */`), avec un commentaire expliquant pourquoi il reste
dans la signature (conformite ERC-7943) sans etre utilise.

### 5. `require` avec chaine plutot qu'erreur personnalisee (`forge lint` `custom-errors`)

Ajoute en corrigeant le finding n1 avec un `require(..., "string")`. Le
reste du contrat utilise deja des erreurs personnalisees
(`UnsupportedTokenId`) ; corrige par coherence et pour le gas (`revert
ForcedTransferFailed()`).

## Findings acceptes (documentes, non corriges)

### Reentrancy-events (Slither, 2 instances)

`forcedTransfer` et `setFrozenTokens` emettent leur evenement **apres**
l'appel externe au token. Slither le signale par principe (un ordre
d'evenements pourrait etre perturbe par une reentrance). Accepte parce
que :

- L'adaptateur ne detient **aucun etat mutable** (seul `token` est
  immutable) : il n'y a rien a corrompre par reentrance cote adaptateur.
- Ces fonctions n'ont **aucun controle d'acces propre** a contourner — le
  controle d'acces reel vit dans le role d'agent du token, verifie par le
  token lui-meme a chaque appel entrant, reentrance ou non.
- `token` est immutable : il ne peut pas etre remplace apres deploiement
  par une adresse malveillante. Si le token sous-jacent lui-meme est
  compromis, c'est une rupture de confiance qui prexiste a l'adaptateur
  (meme risque que d'utiliser directement ce token sans passer par
  l'adaptateur).

### Erreurs `ERC7943Cannot*` declarees mais non levees (Aderyn `L-1`, 4 instances restantes)

`IERC7943.sol` declare quatre erreurs (`ERC7943CannotSend`,
`ERC7943CannotReceive`, `ERC7943CannotTransfer`,
`ERC7943InsufficientUnfrozenBalance`) que cette implementation ne leve
jamais — l'adaptateur choisit de **renvoyer** `false`/`true` plutot que de
reverter avec une erreur riche pour les fonctions de lecture. Ces erreurs
restent declarees dans l'interface parce qu'elles font partie de la
surface du brouillon ERC-7943 (voir `IERC7943.sol`, qui doit rester fidele
au standard pour qu'un seul fichier absorbe toute sa derive — voir README).
Les retirer romprait cette garantie pour un gain nul.

### Notes de style `forge lint` (7 instances, severite `note`)

- `screaming-snake-case-immutable` sur `token` : conserve en minuscule,
  deja utilise comme nom d'API public dans le frontend et les tests
  (`adapter.token()`). Renommer casserait la coherence pour un gain de
  style seul.
- `multi-contract-file` (x4) : les quatre interfaces minimales
  (`IERC165`, `IERC3643Minimal`, `IIdentityRegistryMinimal`,
  `IComplianceMinimal`) sont **deliberement** colocalisees dans
  `ERC7943Adapter.sol` — c'est la raison d'etre du "sans dependance
  externe, deux fichiers" documentee des l'en-tete du contrat. Les
  separer contredirait ce choix de conception explicite.

## Layer 2 — Fuzzing (Foundry)

`test/foundry/ERC7943Adapter.fuzz.t.sol` (mock `IERC3643Minimal`
controlable, `test/foundry/mocks/MockERC3643.sol`) — complement aux 15
tests deterministes de `test/adapters/erc7943.test.ts` (qui restent la
reference, executes contre un **vrai** token T-REX). Le fuzzing explore
des combinaisons de valeurs (bornes de `uint256`, sequences aleatoires)
qu'une fixture fixe ne couvre pas :

| Propriete testee | Runs | Resultat |
|---|---|---|
| `canSend` ne sous-flow jamais (`balance`/`frozen` a n'importe quelle valeur) | 256 | ✅ |
| `canSend` renvoie toujours `false` sur pause/gel/non-verifie, jamais un revert | 256 | ✅ |
| `setFrozenTokens` traduit toute paire (current, target) en delta exact | 256 | ✅ |
| `setFrozenTokens` ne produit aucun effet si la cible est deja atteinte | 256 | ✅ |
| Tout `tokenId != 0` revert sur les 6 fonctions (lecture + ecriture) | 256 | ✅ |
| `getFrozenTokens` renvoie le solde entier si l'adresse est totalement gelee | 256 | ✅ |
| `forcedTransfer` revert si le token sous-jacent renvoie `false` (regression du finding n1) | 256 | ✅ |

```bash
forge test --match-path "test/foundry/*"
```

## Limites de cet audit

- **Pas d'audit professionnel independant.** Cette chaine d'outils est un
  filet mecanique, pas un remplacement pour une revue manuelle
  ligne-par-ligne par un cabinet specialise — c'est explicitement la
  position de la methodologie suivie ici (voir le skill
  `solidity-security-audit`).
- **Certora (verification formelle) non execute** : necessite une cle
  `CERTORAKEY` (licence Certora) non disponible dans cet environnement.
- **Halmos (execution symbolique) non execute** : la logique de
  l'adaptateur (arithmetique lineaire simple, pas de multiplication/
  division sur des symboliques) se prete bien a Halmos, mais n'a pas ete
  mise en place dans cette passe — le fuzzing Foundry ci-dessus couvre
  deja les memes proprietes de maniere probabiliste plutot
  qu'exhaustive.
- **Gambit (mutation testing) non execute** : couteux (recompilation +
  suite complete par mutant), recommande une fois avant remise a un
  auditeur externe plutot qu'a chaque commit — pas execute dans cette
  passe faute de temps disponible.
- **La suite T-REX vendorisee est hors perimetre.** Son propre audit
  (Hacken, voir `backend/README.TREX.md`) date de la version 4.x du
  depot Tokeny ; toute modification locale de ces fichiers sortirait du
  perimetre couvert par cet audit-la.

## Recommandation

Avant tout deploiement mainnet avec des actifs reels : commanditer un
audit professionnel independant (voir
[guide institutions §5](../docs/guide-institutions.md#5-etat-du-brouillon-erc7943-et-surface-de-risque)).
Cette passe automatisee reduit le risque de bugs triviaux avant cet audit,
elle ne s'y substitue pas.
