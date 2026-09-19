# Adaptateur ERC-7943 — frontend

Depot : [github.com/RaptorsGeek7612/erc7943-adapter](https://github.com/RaptorsGeek7612/erc7943-adapter)

Console d'inspection et d'administration pour un contrat `ERC7943Adapter`
(voir `../backend`). Next.js (App Router) + Tailwind CSS + RainbowKit/wagmi,
en pnpm.

## Fonctionnalites

- Connexion de portefeuille (RainbowKit).
- Saisie de l'adresse d'un `ERC7943Adapter` deploye, persistee en local (`localStorage`).
- **Vue d'ensemble** : token ERC-3643 sous-jacent, `interfaceId` ERC-7943 calcule,
  `supportsInterface`.
- **Verifications de conformite (lecture)** : `canSend`, `canReceive`, `canTransfer`,
  `getFrozenTokens` — sans wallet requis.
- **Actions d'agent (ecriture)** : `setFrozenTokens`, `forcedTransfer` — necessitent
  un portefeuille connecte qui detient le role d'agent sur le token cible ; sinon la
  transaction revert (comportement voulu par l'adaptateur, voir `../backend/README.md`).

## Installation

```bash
pnpm install
cp .env.example .env.local   # renseigne NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
pnpm dev
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` provient d'un projet cree sur
[cloud.reown.com](https://cloud.reown.com) (ex-WalletConnect Cloud). Sans cette
variable, RainbowKit fonctionne toujours pour les portefeuilles injectes
(MetaMask, etc.) mais WalletConnect est desactive (avertissement en console).

`NEXT_PUBLIC_DEFAULT_ADAPTER_ADDRESS` est optionnel : adresse pre-remplie au
premier chargement si rien n'est encore en `localStorage`.

## Scripts

```bash
pnpm dev      # serveur de developpement (Turbopack)
pnpm build    # build de production
pnpm start    # sert le build de production
pnpm lint     # ESLint
```

## Regenerer l'ABI

`src/lib/erc7943AdapterAbi.ts` est recopie depuis l'artefact Hardhat du backend.
Apres toute modification du contrat :

```bash
cd ../backend && pnpm exec hardhat compile
```

puis reporter le contenu de
`backend/artifacts/contracts/adapters/ERC7943Adapter.sol/ERC7943Adapter.json` (champ `abi`)
dans `src/lib/erc7943AdapterAbi.ts`.

## Notes techniques

- RainbowKit 2.x impose `wagmi@^2.9.0` : `wagmi` est volontairement fixe en v2
  (pas v3) dans `package.json`, RainbowKit n'ayant pas encore de version
  compatible avec wagmi v3 au moment de l'ecriture.
- `next.config.ts` externalise `@coinbase/cdp-sdk` et `@base-org/account` :
  ces dependances transitives du connecteur "Base Account" de wagmi font des
  `import()` dynamiques optionnels vers des packages `@x402/*` (protocole de
  paiement) non installes et jamais invoques ici. Sans cette externalisation,
  le build echoue avec `Module not found`.
