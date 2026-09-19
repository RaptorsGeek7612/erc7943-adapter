import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deployFullSuiteFixture } from '../fixtures/deploy-full-suite.fixture';

/**
 * L'adaptateur est testé contre un VRAI token T-REX, pas contre une doublure.
 *
 * C'est le seul moyen de valider la traduction : si `isFrozen`,
 * `getFrozenTokens` ou `identityRegistry()` n'ont pas la forme attendue,
 * un mock le cacherait et le déploiement réel le révélerait trop tard.
 */
describe('ERC7943Adapter', () => {
  async function setup() {
    const context = await loadFixture(deployFullSuiteFixture);
    const adapter = await ethers.deployContract('ERC7943Adapter', [context.suite.token.address]);
    await adapter.deployed();
    return { ...context, adapter };
  }

  describe('lecture déléguée', () => {
    it('autorise un transfert entre deux porteurs vérifiés', async () => {
      const { adapter, accounts } = await setup();
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, 1)).to.be.true;
      expect(await adapter.canReceive(accounts.bobWallet.address, 0, 1)).to.be.true;
      expect(await adapter.canTransfer(accounts.aliceWallet.address, accounts.bobWallet.address, 0, 1))
        .to.be.true;
    });

    it('refuse un destinataire sans identité enregistrée', async () => {
      const { adapter, accounts } = await setup();
      const stranger = accounts.anotherWallet.address;
      expect(await adapter.canReceive(stranger, 0, 1)).to.be.false;
      expect(await adapter.canTransfer(accounts.aliceWallet.address, stranger, 0, 1)).to.be.false;
    });

    it('refuse au-delà du solde disponible', async () => {
      const { adapter, accounts, suite } = await setup();
      const balance = await suite.token.balanceOf(accounts.aliceWallet.address);
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, balance)).to.be.true;
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, balance.add(1))).to.be.false;
    });

    it('reflète une pause du token', async () => {
      const { adapter, accounts, suite } = await setup();
      await suite.token.connect(accounts.tokenAgent).pause();
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, 1)).to.be.false;
      expect(await adapter.canReceive(accounts.bobWallet.address, 0, 1)).to.be.false;
    });

    it('reflète un gel total d\'adresse', async () => {
      const { adapter, accounts, suite } = await setup();
      await suite.token.connect(accounts.tokenAgent).setAddressFrozen(accounts.aliceWallet.address, true);
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, 1)).to.be.false;
    });
  });

  describe('gel partiel', () => {
    it('renvoie la quantité gelée partiellement', async () => {
      const { adapter, accounts, suite } = await setup();
      await suite.token.connect(accounts.tokenAgent).freezePartialTokens(accounts.aliceWallet.address, 100);
      expect(await adapter.getFrozenTokens(accounts.aliceWallet.address, 0)).to.equal(100);
    });

    it('réduit la part envoyable du montant gelé', async () => {
      const { adapter, accounts, suite } = await setup();
      const balance = await suite.token.balanceOf(accounts.aliceWallet.address);
      await suite.token.connect(accounts.tokenAgent).freezePartialTokens(accounts.aliceWallet.address, 100);
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, balance.sub(100))).to.be.true;
      expect(await adapter.canSend(accounts.aliceWallet.address, 0, balance.sub(99))).to.be.false;
    });

    /**
     * La divergence assumée n° 3 du README : ERC-7943 ne connaît que des
     * quantités, pas de gel total. Une adresse entièrement gelée doit donc
     * remonter son solde entier, sinon un consommateur croirait des jetons
     * disponibles alors qu'aucun ne bouge.
     */
    it('remonte le solde entier quand l\'adresse est totalement gelée', async () => {
      const { adapter, accounts, suite } = await setup();
      const balance = await suite.token.balanceOf(accounts.aliceWallet.address);
      await suite.token.connect(accounts.tokenAgent).setAddressFrozen(accounts.aliceWallet.address, true);
      expect(await adapter.getFrozenTokens(accounts.aliceWallet.address, 0)).to.equal(balance);
    });
  });

  describe('écriture sans le rôle d\'agent', () => {
    it('revert sur forcedTransfer tant que le rôle n\'est pas accordé', async () => {
      const { adapter, accounts } = await setup();
      await expect(
        adapter.forcedTransfer(accounts.aliceWallet.address, accounts.bobWallet.address, 0, 1),
      ).to.be.reverted;
    });

    it('revert sur setFrozenTokens tant que le rôle n\'est pas accordé', async () => {
      const { adapter, accounts } = await setup();
      await expect(adapter.setFrozenTokens(accounts.aliceWallet.address, 0, 100)).to.be.reverted;
    });
  });

  describe('écriture avec le rôle d\'agent', () => {
    async function withAgent() {
      const ctx = await setup();
      await ctx.suite.token.connect(ctx.accounts.deployer).addAgent(ctx.adapter.address);
      return ctx;
    }

    it('exécute un transfert forcé et émet ForcedTransfer', async () => {
      const { adapter, accounts, suite } = await withAgent();
      const before = await suite.token.balanceOf(accounts.bobWallet.address);
      await expect(
        adapter.forcedTransfer(accounts.aliceWallet.address, accounts.bobWallet.address, 0, 50),
      )
        .to.emit(adapter, 'ForcedTransfer')
        .withArgs(accounts.aliceWallet.address, accounts.bobWallet.address, 0, 50);
      expect(await suite.token.balanceOf(accounts.bobWallet.address)).to.equal(before.add(50));
    });

    /**
     * Le point le plus délicat du contrat : ERC-7943 écrase une quantité,
     * ERC-3643 gèle et dégèle de façon incrémentale. L'adaptateur calcule
     * le delta. Ce test parcourt les deux sens et le cas sans changement.
     */
    it('traduit setFrozenTokens dans les deux sens', async () => {
      const { adapter, accounts, suite } = await withAgent();
      const alice = accounts.aliceWallet.address;

      await adapter.setFrozenTokens(alice, 0, 100);
      expect(await suite.token.getFrozenTokens(alice)).to.equal(100);

      // Vers le haut : gel incrémental de 150.
      await adapter.setFrozenTokens(alice, 0, 250);
      expect(await suite.token.getFrozenTokens(alice)).to.equal(250);

      // Vers le bas : dégel incrémental de 200.
      await adapter.setFrozenTokens(alice, 0, 50);
      expect(await suite.token.getFrozenTokens(alice)).to.equal(50);

      // Valeur identique : aucun appel, aucun effet.
      await adapter.setFrozenTokens(alice, 0, 50);
      expect(await suite.token.getFrozenTokens(alice)).to.equal(50);

      // Retour à zéro.
      await adapter.setFrozenTokens(alice, 0, 0);
      expect(await suite.token.getFrozenTokens(alice)).to.equal(0);
    });

    it('émet Frozen avec la quantité cible, pas le delta', async () => {
      const { adapter, accounts } = await withAgent();
      await adapter.setFrozenTokens(accounts.aliceWallet.address, 0, 100);
      await expect(adapter.setFrozenTokens(accounts.aliceWallet.address, 0, 300))
        .to.emit(adapter, 'Frozen')
        .withArgs(accounts.aliceWallet.address, 0, 300);
    });
  });

  describe('fongibilité et introspection', () => {
    it('revert sur tout tokenId non nul', async () => {
      const { adapter, accounts } = await setup();
      await expect(adapter.canSend(accounts.aliceWallet.address, 1, 1)).to.be.revertedWithCustomError(
        adapter,
        'UnsupportedTokenId',
      );
      await expect(adapter.getFrozenTokens(accounts.aliceWallet.address, 7)).to.be.reverted;
    });

    it('déclare son interfaceId et le supporte', async () => {
      const { adapter } = await setup();
      const id = await adapter.erc7943InterfaceId();
      expect(await adapter.supportsInterface(id)).to.be.true;
      expect(await adapter.supportsInterface('0x01ffc9a7')).to.be.true; // ERC-165
      expect(await adapter.supportsInterface('0xffffffff')).to.be.false;
      // Valeur effective, à comparer avec l'EIP une fois finalisé.
      console.log('        interfaceId ERC-7943 calculé :', id);
    });
  });
});
