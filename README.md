# Adaptateur ERC-7943

Adaptateur exposant un token [ERC-3643](https://eips.ethereum.org/EIPS/eip-3643)
existant a travers l'interface [ERC-7943](https://eips.ethereum.org/EIPS/eip-7943)
(uRWA), sans le redeployer.

- **[`backend/`](./backend)** — contrats Solidity (`0.8.35` pour l'adaptateur),
  vendorises dans un clone de [T-REX](https://github.com/TokenySolutions/T-REX)
  (implementation de reference ERC-3643) pour tester contre un vrai token, pas
  une doublure. Hardhat, pnpm.
- **[`frontend/`](./frontend)** — console Next.js / Tailwind CSS / RainbowKit
  pour inspecter et administrer un adaptateur deploye. pnpm.

## Demarrage rapide

```bash
# Contrats
cd backend
pnpm install --ignore-scripts
pnpm exec hardhat compile
pnpm run test:adapter

# Interface
cd ../frontend
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
pnpm dev
```

Voir le README de chaque dossier pour le detail (divergences assumees avec le
brouillon ERC-7943, choix de compilateur, variables d'environnement).
