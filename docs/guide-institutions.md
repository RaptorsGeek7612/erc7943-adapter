# Guide institutions — Adaptateur ERC-7943 pour token ERC-3643

Ce document s'adresse aux equipes techniques, juridiques et de conformite
d'une institution qui envisage d'utiliser, de deployer ou d'auditer cet
adaptateur pour exposer un token de securite (security token) ERC-3643
au travers de l'interface universelle ERC-7943.

Il complete le [guide utilisateur](./guide-utilisateur.md) (usage de la
console) et le [README technique du backend](../backend/README.md)
(details d'implementation Solidity).

---

## 1. Pourquoi cet adaptateur existe

### 1.1 Le probleme

[ERC-3643](https://eips.ethereum.org/EIPS/eip-3643) (le standard T-REX) est
aujourd'hui le standard de reference pour l'emission de titres tokenises
conformes : identite verifiee, registre de conformite, gel et transfert
force par une autorite. Il est deploye et audite depuis plusieurs annees
chez de nombreux emetteurs.

[ERC-7943](https://eips.ethereum.org/EIPS/eip-7943) (« uRWA », Universal
Real-World Asset) est un brouillon plus recent qui vise a standardiser une
interface *minimale* pour n'importe quel actif reglemente — afin qu'un
protocole tiers (pool de liquidite, plateforme de pret, agregateur) puisse
poser des questions de conformite basiques (« ce transfert est-il
autorise ? », « ce compte est-il gele ? ») **sans connaitre l'implementation
sous-jacente** du token.

Un emetteur ERC-3643 en production ne va pas redeployer son token pour
gagner une compatibilite avec un nouveau standard encore au stade brouillon.
L'adaptateur resout cette tension : il se deploie **a cote** du token
existant, traduit les appels ERC-7943 vers les fonctions ERC-3643
correspondantes, et **ne detient jamais de fonds**.

### 1.2 Ce que l'adaptateur n'est pas

- Ce n'est **pas** une reimplementation du token : le token ERC-3643
  original continue de faire foi sur les soldes, l'identite et la
  conformite.
- Ce n'est **pas** un contrat de garde (custody) : l'adaptateur ne recoit et
  ne detient jamais de tokens.
- Ce n'est **pas** une nouvelle couche de gouvernance : il ne definit aucun
  role qui lui soit propre (voir §3).

## 2. Architecture

```
                    ┌─────────────────────────┐
   Protocole tiers  │                         │
   (pool, pret,     │──canSend/canReceive────▶│   ERC7943Adapter        │
   agregateur...)   │──canTransfer──────────▶ │   (ce depot)            │
                    │──getFrozenTokens──────▶ │   - ne detient rien     │
                    │◀──true/false/uint──────│   - lecture deleguee    │
                    └─────────────────────────┘   - ecriture = role     │
                                 │                   d'agent requis     │
                                 │ delegue vers      └──────────┬───────┘
                                 ▼                              │
                    ┌─────────────────────────┐                │
                    │   Token ERC-3643        │◀───────────────┘
                    │   (T-REX, deja deploye) │   forcedTransfer /
                    │   - solde des porteurs  │   freezePartialTokens /
                    │   - registre d'identite │   unfreezePartialTokens
                    │   - module de conformite│
                    └─────────────────────────┘
```

Deux composants dans ce depot :

| Composant | Role | Reference |
|---|---|---|
| `backend/` | Contrats Solidity : `IERC7943.sol` (interface, isolant toute la derive du brouillon), `ERC7943Adapter.sol` (traduction) | [backend/README.md](../backend/README.md) |
| `frontend/` | Console web de lecture/administration | [docs/guide-utilisateur.md](./guide-utilisateur.md) |

## 3. Gouvernance du role d'agent

C'est la decision la plus importante avant toute mise en production.

### 3.1 Ce qui fonctionne sans rien accorder

Toutes les fonctions de **lecture** (`canSend`, `canReceive`, `canTransfer`,
`getFrozenTokens`) sont deleguees integralement au token, a son registre
d'identite et a son module de conformite. **Aucun etat n'est duplique** :
l'adaptateur ne peut donc jamais diverger de la verite on-chain. Ces
fonctions sont utilisables des le deploiement, par n'importe qui, sans
configuration supplementaire.

### 3.2 Ce qui exige une decision de gouvernance

`forcedTransfer` et `setFrozenTokens` necessitent que **le contrat
adaptateur lui-meme** detienne le role d'agent sur le token ERC-3643
(fonction `addAgent` du token, reservee au proprietaire/administrateur du
token).

Accorder ce role revient a deplacer une part de confiance vers le controle
d'acces **du contrat adaptateur**, et non plus uniquement vers les comptes
qui appellent directement le token. Concretement :

- Toute adresse capable d'appeler `forcedTransfer`/`setFrozenTokens` **sur
  l'adaptateur** pourra alors executer ces actions sur le token, exactement
  comme si elle appelait le token directement avec le role d'agent.
- L'adaptateur **n'ajoute deliberement aucune couche de roles a lui**. Deux
  sources de verite sur « qui peut geler » constitueraient une faille de
  conception, pas une securite supplementaire. Le controle d'acces reste
  entierement le probleme du token et de son administrateur.
- **Tant que le role n'est pas accorde, ces deux fonctions revert.** C'est
  volontaire : un adaptateur qui echouerait silencieusement sur une saisie
  ordonnee par une autorite (judiciaire ou reglementaire) serait pire
  qu'inutile.

### 3.3 Recommandations operationnelles

- Traiter l'octroi du role d'agent a l'adaptateur comme un **changement de
  controle d'acces de production** : revue a plusieurs, deploiement depuis
  un compte multisig, journalisation de la decision.
- Documenter en interne **qui** est autorise a appeler `forcedTransfer` (les
  cas d'usage legitimes sont typiquement : execution d'une decision de
  justice, correction d'une erreur d'emission averee, recuperation d'actifs
  suite a la perte des cles d'un porteur — selon le cadre contractuel de
  l'emission).
- Envisager de retirer le role d'agent a l'adaptateur (`removeAgent` sur le
  token) si l'usage ERC-7943 devient temporaire ou experimental, plutot que
  de le laisser actif indefiniment sans usage.

## 4. Divergences assumees avec le brouillon ERC-7943

Trois choix de traduction, documentes et testes :

1. **`tokenId` doit valoir 0.** ERC-3643 est purement fongible ; tout appel
   avec un `tokenId` non nul revert plutot que de renvoyer une reponse
   plausible mais fausse.
2. **`setFrozenTokens` ecrase une quantite cible**, alors qu'ERC-3643 expose
   un gel/degel **incremental**. L'adaptateur calcule le delta et appelle la
   fonction correspondante cote token. C'est la traduction la plus delicate
   du contrat — couverte par des tests dedies (voir
   [backend/test/adapters/erc7943.test.ts](../backend/test/adapters/erc7943.test.ts)).
3. **Le gel total d'une adresse n'a pas d'equivalent dans ERC-7943**, qui ne
   connait que des quantites. `getFrozenTokens` renvoie donc le solde entier
   quand l'adresse est integralement gelee, pour eviter qu'un consommateur
   du standard ne croie des tokens disponibles alors qu'aucun ne peut
   bouger.

## 5. Etat du brouillon ERC-7943 et surface de risque

**ERC-7943 est un brouillon au stade *Review*.** Les noms de fonctions ont
deja change au moins deux fois publiquement avant la version actuelle :

| Version initiale | Version actuelle (implementee ici) |
|---|---|
| `forceTransfer` | `forcedTransfer` |
| `isTransferAllowed` | `canTransfer` |
| `isUserAllowed` | `canSend` / `canReceive` |
| `setFrozen` / `getFrozen` | `setFrozenTokens` / `getFrozenTokens` |

Toute la derive du standard est concentree dans un seul fichier,
`backend/contracts/adapters/IERC7943.sol` : si l'EIP change encore de nom
ou de signature avant finalisation, seul ce fichier doit etre corrige et
recompile.

**Avant tout usage en production**, verifier `IERC7943.sol` contre la
version finale de [eip-7943](https://eips.ethereum.org/EIPS/eip-7943), et
comparer l'`interfaceId` calcule (expose par
`ERC7943Adapter.erc7943InterfaceId()`) avec celui publie dans l'EIP finale.
Un changement de signature ferait automatiquement changer cette valeur —
c'est le signal a surveiller.

**L'adaptateur n'est pas audite par un cabinet independant.** Une chaine
d'analyse automatisee (Slither, Aderyn, Semgrep, `forge lint`, fuzzing
Foundry) a ete executee et ses resultats tries a la main — voir
[backend/AUDIT.md](../backend/AUDIT.md) pour le detail des findings
corriges et acceptes. **Ce n'est pas un substitut a un audit professionnel.**
Toute institution envisageant un usage avec des actifs reels doit
commanditer son propre audit avant mise en production, en particulier sur
le chemin d'ecriture (§3).

## 6. Deployer sa propre instance

Prerequis : un token ERC-3643 deja deploye (T-REX ou compatible, exposant
`balanceOf`, `isFrozen`, `getFrozenTokens`, `paused`, `identityRegistry()`,
`compliance()`, `forcedTransfer`, `freezePartialTokens`,
`unfreezePartialTokens` — voir l'interface minimale
`IERC3643Minimal` dans
[ERC7943Adapter.sol](../backend/contracts/adapters/ERC7943Adapter.sol)).

```bash
git clone https://github.com/RaptorsGeek7612/erc7943-adapter.git
cd erc7943-adapter/backend
pnpm install --ignore-scripts
pnpm exec hardhat compile
pnpm run test:adapter   # 15 tests contre un vrai token T-REX, pas une doublure
```

Deploiement (le script de reference deploie aussi une suite T-REX de
demonstration ; pour une institution disposant deja d'un token en
production, il suffit de deployer uniquement `ERC7943Adapter` avec
l'adresse du token existant en argument du constructeur) :

```solidity
constructor(address _token)  // adresse du token ERC-3643 existant
```

Voir [backend/README.md § Deploiement sur Sepolia](../backend/README.md#deploiement-sur-sepolia)
pour un exemple complet de script Hardhat, et
[backend/scripts/deploy-sepolia.ts](../backend/scripts/deploy-sepolia.ts)
comme reference.

Apres deploiement :

1. Verifier le contrat sur l'explorateur de bloc concerne (`hardhat verify`,
   voir README backend) pour que le code source soit publiquement
   auditable.
2. Decider de l'octroi (ou non) du role d'agent — voir §3.
3. Renseigner l'adresse dans la console (`frontend/`) ou dans
   `NEXT_PUBLIC_DEFAULT_ADAPTER_ADDRESS` si l'institution heberge sa propre
   instance de la console.

## 7. Verification et audit continu

| Verification | Comment | Frequence recommandee |
|---|---|---|
| Code source du contrat correspond au depot | `hardhat verify` puis lecture sur Etherscan/explorateur | A chaque deploiement |
| `interfaceId` toujours conforme a l'EIP | `erc7943InterfaceId()` compare a la valeur publiee dans l'EIP finale | A chaque mise a jour de l'EIP ou du contrat |
| Role d'agent toujours attribue aux bonnes adresses | `token.isAgent(adresse)` sur le token ERC-3643 | Revue periodique (ex. trimestrielle) |
| Suite de tests toujours au vert | `pnpm run test:adapter` | A chaque changement de version de compilateur ou de dependance |
| Absence de regression sur les divergences (§4) | Tests dedies dans `test/adapters/erc7943.test.ts` | A chaque changement de contrat |

## 8. Contexte reglementaire

ERC-3643 a ete concu des l'origine pour repondre aux exigences de
tokenisation de titres financiers reglementes (identite verifiee via
ONCHAINID, conformite programmable, gel et transfert sous mandat d'une
autorite). L'adaptateur ERC-7943 **n'ajoute ni ne retire aucune garantie
de conformite** : il traduit des questions vers les memes verifications
que celles deja en place sur le token. La responsabilite de la conformite
reglementaire reste entierement portee par la configuration du token
ERC-3643 (registre d'identite, modules de conformite actives, autorite
d'emission).

Ce depot ne constitue pas un avis juridique. Toute institution doit faire
valider son usage par son conseil juridique et son departement conformite
avant mise en production, en particulier au regard des reglementations
applicables a sa juridiction (ex. MiCA en Union europeenne).

## 9. Reference technique rapide

| Fonction | Type | Role d'agent requis |
|---|---|---|
| `canSend(from, 0, amount)` | Lecture | Non |
| `canReceive(to, 0, amount)` | Lecture | Non |
| `canTransfer(from, to, 0, amount)` | Lecture | Non |
| `getFrozenTokens(user, 0)` | Lecture | Non |
| `setFrozenTokens(user, 0, amount)` | Ecriture | Oui |
| `forcedTransfer(from, to, 0, amount)` | Ecriture | Oui |
| `token()` | Lecture | Non — renvoie l'adresse du token ERC-3643 sous-jacent |
| `erc7943InterfaceId()` | Lecture | Non — valeur a comparer avec l'EIP final |
| `supportsInterface(bytes4)` | Lecture | Non — ERC-165 |

Deploiement de reference (Sepolia, a des fins de demonstration
uniquement — ne pas utiliser pour des actifs reels) :

| Contrat | Adresse |
|---|---|
| Adaptateur | [`0x6D2063A5a570fEEd7ef9abC301B8f3274Eef9052`](https://sepolia.etherscan.io/address/0x6D2063A5a570fEEd7ef9abC301B8f3274Eef9052#code) |
| Token ERC-3643 (T-REX Sepolia Demo) | [`0xe43ca4B4100f82DB567BBb771C5DD70f4150d7c1`](https://sepolia.etherscan.io/address/0xe43ca4B4100f82DB567BBb771C5DD70f4150d7c1#code) |

## 10. References

- [EIP-7943 (uRWA)](https://eips.ethereum.org/EIPS/eip-7943)
- [EIP-3643 (T-REX)](https://eips.ethereum.org/EIPS/eip-3643)
- [Depot T-REX de reference (Tokeny)](https://github.com/TokenySolutions/T-REX)
- [Code source de l'adaptateur](../backend/contracts/adapters/ERC7943Adapter.sol)
- [Suite de tests](../backend/test/adapters/erc7943.test.ts)
- [Guide utilisateur de la console](./guide-utilisateur.md)
