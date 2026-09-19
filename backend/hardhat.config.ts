import '@xyrusworx/hardhat-solidity-json';
// Equivalent a @nomicfoundation/hardhat-toolbox, mais sans son
// @nomiclabs/hardhat-etherscan embarque : ce plugin est deprecie, fige sur
// l'API Etherscan V1 (desormais refusee - "V2-only" depuis la migration
// Etherscan), et definit une tache "verify" qui entre en conflit avec celle
// de @nomicfoundation/hardhat-verify (V2) si les deux sont charges ensemble.
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-network-helpers';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import '@nomicfoundation/hardhat-verify';
import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import '@nomiclabs/hardhat-solhint';
import '@primitivefi/hardhat-dodoc';
import * as dotenv from 'dotenv';

dotenv.config();

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  networks: {
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
  etherscan: {
    // "enabled" rendu explicite : la valeur par defaut du plugin se perd
    // entre le chargement de la config et l'execution de la tache "verify"
    // dans cet environnement (double resolution du module hardhat par pnpm).
    enabled: true,
    // Cle unique (API Etherscan V2, valable sur toutes les chaines) : un
    // objet {reseau: cle} bascule le plugin en mode V1 deprecie et refuse.
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  solidity: {
    compilers: [
      {
        // Suite T-REX vendorisee (contracts/) : figee par l'amont, ne pas toucher.
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        // Adaptateur ERC-7943 (contracts/adapters/).
        version: '0.8.35',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  gasReporter: {
    enabled: true,
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },
};

export default config;
