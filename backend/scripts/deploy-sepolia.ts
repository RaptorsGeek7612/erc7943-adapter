/**
 * Deploie une suite T-REX (ERC-3643) minimale sur Sepolia, puis l'adaptateur
 * ERC-7943 par-dessus, avec un seul compte (le deployeur) cumulant tous les
 * roles utiles a la demo : emetteur, agent du token, agent du registre.
 *
 * Volontairement simplifie par rapport a test/fixtures/deploy-full-suite.fixture.ts :
 * pas de modules de compliance, pas de topics de claim (IdentityRegistry.isVerified
 * renvoie alors true des qu'une identite existe, cf. IdentityRegistry.sol:176).
 *
 * Le nonce est gere manuellement (une seule lecture au demarrage, puis un
 * compteur local) : ethereum-sepolia-rpc.publicnode.com repartit les requetes
 * sur plusieurs noeuds sans session collante, et deux appels consecutifs a
 * eth_getTransactionCount("pending") peuvent atterrir sur des noeuds pas
 * encore synchronises entre eux, provoquant des collisions de nonce
 * ("replacement transaction underpriced").
 *
 * Usage : pnpm exec hardhat run scripts/deploy-sepolia.ts --network sepolia
 */
import hre, { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error('Aucun signataire : verifie DEPLOYER_PRIVATE_KEY dans backend/.env');
  }
  console.log('Deployeur :', deployer.address);
  console.log('Solde     :', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');

  let nonce = await ethers.provider.getTransactionCount(deployer.address, 'latest');
  const takeNonce = () => nonce++;
  console.log('Nonce de depart :', nonce);

  async function deployRaw(abi: unknown, bytecode: string, args: unknown[]) {
    const contract = await new ethers.ContractFactory(abi as never, bytecode, deployer).deploy(...args, { nonce: takeNonce() });
    await contract.deployed();
    return contract;
  }

  async function deployNamed(name: string, args: unknown[] = []) {
    const factory = await ethers.getContractFactory(name, deployer);
    const contract = await factory.deploy(...args, { nonce: takeNonce() });
    await contract.deployed();
    return contract;
  }

  // --- OnchainID (identites) -------------------------------------------------
  const identityImplementation = await deployRaw(OnchainID.contracts.Identity.abi, OnchainID.contracts.Identity.bytecode, [deployer.address, true]);

  const identityImplementationAuthority = await deployRaw(OnchainID.contracts.ImplementationAuthority.abi, OnchainID.contracts.ImplementationAuthority.bytecode, [
    identityImplementation.address,
  ]);

  const identityFactory = await deployRaw(OnchainID.contracts.Factory.abi, OnchainID.contracts.Factory.bytecode, [identityImplementationAuthority.address]);

  async function deployIdentityProxy(managementKey: string) {
    const identity = await deployRaw(OnchainID.contracts.IdentityProxy.abi, OnchainID.contracts.IdentityProxy.bytecode, [
      identityImplementationAuthority.address,
      managementKey,
    ]);
    return ethers.getContractAt('Identity', identity.address, deployer);
  }

  // --- Implementations T-REX --------------------------------------------------
  const claimTopicsRegistryImplementation = await deployNamed('ClaimTopicsRegistry');
  const trustedIssuersRegistryImplementation = await deployNamed('TrustedIssuersRegistry');
  const identityRegistryStorageImplementation = await deployNamed('IdentityRegistryStorage');
  const identityRegistryImplementation = await deployNamed('IdentityRegistry');
  const modularComplianceImplementation = await deployNamed('ModularCompliance');
  const tokenImplementation = await deployNamed('Token');

  const trexImplementationAuthority = await deployNamed('TREXImplementationAuthority', [true, ethers.constants.AddressZero, ethers.constants.AddressZero]);

  await (
    await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(
      { major: 4, minor: 0, patch: 0 },
      {
        tokenImplementation: tokenImplementation.address,
        ctrImplementation: claimTopicsRegistryImplementation.address,
        irImplementation: identityRegistryImplementation.address,
        irsImplementation: identityRegistryStorageImplementation.address,
        tirImplementation: trustedIssuersRegistryImplementation.address,
        mcImplementation: modularComplianceImplementation.address,
      },
      { nonce: takeNonce() },
    )
  ).wait();

  // --- Proxies -----------------------------------------------------------------
  const claimTopicsRegistryProxy = await deployNamed('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address]);
  const claimTopicsRegistry = await ethers.getContractAt('ClaimTopicsRegistry', claimTopicsRegistryProxy.address);

  const trustedIssuersRegistryProxy = await deployNamed('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address]);
  const trustedIssuersRegistry = await ethers.getContractAt('TrustedIssuersRegistry', trustedIssuersRegistryProxy.address);

  const identityRegistryStorageProxy = await deployNamed('IdentityRegistryStorageProxy', [trexImplementationAuthority.address]);
  const identityRegistryStorage = await ethers.getContractAt('IdentityRegistryStorage', identityRegistryStorageProxy.address);

  const defaultCompliance = await deployNamed('DefaultCompliance');

  const identityRegistryProxy = await deployNamed('IdentityRegistryProxy', [
    trexImplementationAuthority.address,
    trustedIssuersRegistry.address,
    claimTopicsRegistry.address,
    identityRegistryStorage.address,
  ]);
  const identityRegistry = await ethers.getContractAt('IdentityRegistry', identityRegistryProxy.address);

  await (await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address, { nonce: takeNonce() })).wait();

  // --- Token ---------------------------------------------------------------
  const tokenOID = await deployIdentityProxy(deployer.address);
  const tokenName = 'T-REX Sepolia Demo';
  const tokenSymbol = 'TREXD';
  const tokenDecimals = 0;

  const tokenProxy = await deployNamed('TokenProxy', [
    trexImplementationAuthority.address,
    identityRegistry.address,
    defaultCompliance.address,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenOID.address,
  ]);
  const token = await ethers.getContractAt('Token', tokenProxy.address);

  await (await token.connect(deployer).addAgent(deployer.address, { nonce: takeNonce() })).wait();
  await (await identityRegistry.connect(deployer).addAgent(deployer.address, { nonce: takeNonce() })).wait();
  await (await identityRegistry.connect(deployer).addAgent(token.address, { nonce: takeNonce() })).wait();

  // Le deployeur s'enregistre lui-meme comme porteur verifie (aucun claim topic
  // n'est configure : isVerified() renvoie true des qu'une identite existe).
  const deployerIdentity = await deployIdentityProxy(deployer.address);
  await (
    await identityRegistry.connect(deployer).registerIdentity(deployer.address, deployerIdentity.address, 42, { nonce: takeNonce() })
  ).wait();

  await (await token.connect(deployer).mint(deployer.address, 1_000_000, { nonce: takeNonce() })).wait();
  await (await token.connect(deployer).unpause({ nonce: takeNonce() })).wait();

  // --- Adaptateur ERC-7943 --------------------------------------------------
  const adapter = await deployNamed('ERC7943Adapter', [token.address]);

  // Sans ce role, forcedTransfer/setFrozenTokens revert (voir README backend).
  await (await token.connect(deployer).addAgent(adapter.address, { nonce: takeNonce() })).wait();

  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    token: token.address,
    tokenOID: tokenOID.address,
    identityRegistry: identityRegistry.address,
    identityRegistryStorage: identityRegistryStorage.address,
    claimTopicsRegistry: claimTopicsRegistry.address,
    trustedIssuersRegistry: trustedIssuersRegistry.address,
    defaultCompliance: defaultCompliance.address,
    trexImplementationAuthority: trexImplementationAuthority.address,
    identityImplementationAuthority: identityImplementationAuthority.address,
    identityFactory: identityFactory.address,
    adapter: adapter.address,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'deployments', `${hre.network.name}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log('\nDeploiement termine.');
  console.log('Token ERC-3643  :', token.address);
  console.log('Adaptateur      :', adapter.address);
  console.log('Adresse enregistree dans', outPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
