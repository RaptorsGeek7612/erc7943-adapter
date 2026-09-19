import '@xyrusworx/hardhat-solidity-json';
import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import '@nomiclabs/hardhat-solhint';
import '@primitivefi/hardhat-dodoc';

const config: HardhatUserConfig = {
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
