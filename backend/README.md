# ERC-7943 Adapter for ERC-3643 (backend)

Depot : [github.com/RaptorsGeek7612/erc7943-adapter](https://github.com/RaptorsGeek7612/erc7943-adapter)

Expose un token ERC-3643 existant a travers l'interface ERC-7943 (uRWA), sans le redeployer.

Ce dossier **est** un clone vendorise de [T-REX](https://github.com/TokenySolutions/T-REX)
(l'implementation de reference ERC-3643), avec l'adaptateur ajoute dans
`contracts/adapters/` et teste dans `test/adapters/` contre un **vrai** token
T-REX deploye via les fixtures existantes de ce depot (`test/fixtures/`).
Le README original de T-REX reste disponible dans [README.TREX.md](./README.TREX.md).

## Pourquoi un adaptateur

ERC-7943 est un denominateur commun destine aux **consommateurs** : un pool AMM, un protocole de pret ou un agregateur veulent poser une question de conformite sans connaitre l'implementation sous-jacente. Le standard ne prescrit ni identite, ni roles, ni modele de conformite.

Un token ERC-3643 en production ne sera pas redeploye pour gagner une interface. L'adaptateur se place a cote, traduit les questions, et ne detient rien.

## Avertissement

**ERC-7943 est un brouillon au stade Review.** Les noms de fonctions ont deja change au moins deux fois :

| Version initiale | Version actuelle |
|---|---|
| `forceTransfer` | `forcedTransfer` |
| `isTransferAllowed` | `canTransfer` |
| `isUserAllowed` | `canSend` / `canReceive` |
| `setFrozen` / `getFrozen` | `setFrozenTokens` / `getFrozenTokens` |

**Toute la derive est concentree dans `IERC7943.sol`.** L'adaptateur ne reference que cette interface : si un nom change, un seul fichier est a corriger.

Verifie contre https://eips.ethereum.org/EIPS/eip-7943 avant tout usage.

## Ce qui marche sans rien accorder

Les fonctions de **lecture** sont entierement deleguees au token, a son registre d'identites et a sa compliance. Aucun etat duplique, donc aucune divergence possible.

| ERC-7943 | Traduction ERC-3643 |
|---|---|
| `canSend(from, 0, amount)` | pause, `isFrozen`, `isVerified`, solde libre |
| `canReceive(to, 0, amount)` | pause, `isFrozen`, `isVerified` |
| `canTransfer(...)` | les deux ci-dessus + `compliance.canTransfer` |
| `getFrozenTokens(user, 0)` | `getFrozenTokens`, ou le solde entier si l'adresse est totalement gelee |

## Ce qui exige le role d'agent

`forcedTransfer` et `setFrozenTokens` necessitent que **cet adaptateur porte le role d'agent sur le token**. Tant que le role n'est pas accorde, les ecritures revert — volontairement.

L'adaptateur n'ajoute **pas** sa propre couche de roles.

## Trois divergences assumees

1. **`tokenId` doit valoir 0.** ERC-3643 est purement fongible.
2. **`setFrozenTokens` ecrase**, alors qu'ERC-3643 gele et degele de facon incrementale. L'adaptateur calcule le delta.
3. **Le gel total d'une adresse n'existe pas dans ERC-7943.** `getFrozenTokens` renvoie le solde entier quand l'adresse est integralement gelee.

## Versions de compilateur

Ce depot melange deux versions de Solidity, configurees dans `hardhat.config.ts` via `solidity.compilers` :

| Chemin | Version | Raison |
|---|---|---|
| `contracts/**` (T-REX vendorise) | `0.8.17` | Figee par l'amont, ne pas toucher. |
| `contracts/adapters/**` | `0.8.35` | Version demandee pour ce projet. |

Hardhat selectionne le compilateur par fichier selon le pragma déclaré ; les
deux coexistent sans conflit.

## Installation

```bash
pnpm install --ignore-scripts
pnpm exec hardhat compile
pnpm run test:adapter
```

`pnpm run test` execute toute la suite T-REX (plus lent) ; `pnpm run test:adapter`
cible uniquement `test/adapters/erc7943.test.ts`.

## Deploiement sur Sepolia

```bash
cp .env.example .env   # renseigner DEPLOYER_PRIVATE_KEY (voir .env.example)
pnpm exec hardhat run scripts/deploy-sepolia.ts --network sepolia
```

Le script `scripts/deploy-sepolia.ts` deploie une suite T-REX minimale (un seul
compte cumule emetteur/agent) puis l'adaptateur par-dessus, et ecrit les
adresses dans `deployments/<network>.json`. Aucun topic de claim n'est
configure : `IdentityRegistry.isVerified` renvoie donc `true` des qu'une
identite est enregistree (voir `IdentityRegistry.sol:176`).

Le nonce est gere manuellement dans le script (une lecture au demarrage, puis
un compteur local) : le RPC public par defaut
(`ethereum-sepolia-rpc.publicnode.com`) repartit les requetes sur plusieurs
noeuds sans session collante, et des lectures repetees de
`eth_getTransactionCount("pending")` peuvent atterrir sur des noeuds pas
encore synchronises entre eux, provoquant des collisions de nonce
(`replacement transaction underpriced`).

Deploiement de reference (2026-09-19), **code source verifie sur Etherscan** :

| Contrat | Adresse |
|---|---|
| Adaptateur ERC-7943 | [`0x0EDf8DDcD22FF2CB92f8213852bd0eC30Ac23A21`](https://sepolia.etherscan.io/address/0x0EDf8DDcD22FF2CB92f8213852bd0eC30Ac23A21#code) |
| Token ERC-3643 (T-REX Sepolia Demo, `TREXD`, proxy) | [`0xe43ca4B4100f82DB567BBb771C5DD70f4150d7c1`](https://sepolia.etherscan.io/address/0xe43ca4B4100f82DB567BBb771C5DD70f4150d7c1#code) |

### Verifier le code source

```bash
pnpm exec hardhat verify --network sepolia <adresse-adaptateur> <adresse-token>

pnpm exec hardhat verify --network sepolia \
  --contract "contracts/proxy/TokenProxy.sol:TokenProxy" \
  <adresse-token> \
  <trexImplementationAuthority> <identityRegistry> <defaultCompliance> \
  "T-REX Sepolia Demo" "TREXD" "0" <tokenOID>
```

Le token deploye est un `TokenProxy` (voir `contracts/proxy/TokenProxy.sol`), pas
directement un `Token` : `--contract` force le bon contrat, sinon la
detection automatique se trompe sur le bytecode. Les adresses des arguments
du constructeur sont dans `deployments/sepolia.json`.

Deux pieges rencontres lors de la mise en place, corriges dans ce depot :

- **`@nomiclabs/hardhat-etherscan`** (embarque par `hardhat-toolbox`) est
  deprecie, fige sur l'API Etherscan V1 (desormais refusee) et sur un domaine
  DNS mort (`solc-bin.ethereum.org`). Remplace par
  `@nomicfoundation/hardhat-verify`, avec `hardhat-toolbox` demonte en
  imports individuels dans `hardhat.config.ts` (les deux plugins definissent
  une tache `verify` incompatible s'ils sont charges ensemble).
- L'objet `etherscan.apiKey` par reseau (`{ sepolia: "..." }`) declenche le
  mode V1 deprecie cote plugin : sur l'API V2, `apiKey` doit etre une seule
  chaine, valable sur toutes les chaines.

Le detail complet (registres, compliance, autorites) est dans
[`deployments/sepolia.json`](./deployments/sepolia.json). Pour tester depuis
le frontend, colle l'adresse de l'adaptateur dans la console (ou renseigne
`NEXT_PUBLIC_DEFAULT_ADAPTER_ADDRESS` dans `frontend/.env.local`).

## interfaceId mesure

Le contrat calcule `type(IERC7943).interfaceId` a partir de l'interface declaree
dans `IERC7943.sol`. Pour la version d'interface de ce depot, la valeur est :

```
0x5abd1f73
```

**Si l'EIP final annonce une autre valeur, c'est que les signatures ont bouge**
— corrige `IERC7943.sol` et recalcule, ne code jamais la constante en dur.

## Etat

- **Compile** avec solc 0.8.35 (adaptateur) contre le vrai depot T-REX en solc 0.8.17.
- **15 tests passent** contre un vrai token T-REX, pas une doublure.
- Couvert : lecture deleguee, pause, gel total et partiel, refus d'ecriture sans
  le role d'agent, transfert force, traduction de `setFrozenTokens` dans les deux
  sens et sans changement, refus de tout `tokenId` non nul, introspection.
- Non couvert : le comportement face a un token ERC-3643 d'une autre version que
  celle du depot canonique.
- Non audite.

## Licence

Adaptateur : MIT. Suite T-REX vendorisee : voir [LICENSE.md](./LICENSE.md) (GPL-3.0).
