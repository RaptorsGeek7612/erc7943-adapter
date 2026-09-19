// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {Test} from "forge-std/Test.sol";
import {ERC7943Adapter} from "../../contracts/adapters/ERC7943Adapter.sol";
import {MockERC3643} from "./mocks/MockERC3643.sol";

/// @dev Complement Layer 2 (fuzzing) aux 15 tests deterministes de
///      test/adapters/erc7943.test.ts (qui restent la reference, contre un
///      vrai token T-REX). Ici on isole la logique PROPRE de l'adaptateur
///      avec un mock controlable, pour explorer des combinaisons de valeurs
///      (bornes de uint256, sequences aleatoires de gel/degel) qu'une
///      fixture T-REX fixe ne couvre pas facilement.
contract ERC7943AdapterFuzzTest is Test {
    ERC7943Adapter internal adapter;
    MockERC3643 internal token;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        token = new MockERC3643();
        adapter = new ERC7943Adapter(address(token));
        token.setVerified(alice, true);
        token.setVerified(bob, true);
    }

    /// @dev canSend ne doit jamais reverter par underflow (balance/frozen a
    ///      n'importe quelle valeur de uint256, y compris frozen > balance,
    ///      un etat incoherent en theorie mais que l'adaptateur doit quand
    ///      meme geren sans planter) et doit toujours renvoyer exactement
    ///      (balance - frozen) >= amount, borne a 0.
    function testFuzz_canSend_neverUnderflows(uint256 balance, uint256 frozen, uint256 amount) public {
        token.setBalance(alice, balance);
        token.setFrozenTokens(alice, frozen);

        bool result = adapter.canSend(alice, 0, amount);

        uint256 free = balance > frozen ? balance - frozen : 0;
        assertEq(result, free >= amount, "canSend doit refleter exactement le solde libre");
    }

    /// @dev canSend doit renvoyer false pour toute condition bloquante,
    ///      independamment du solde (pause, gel total, identite non
    ///      verifiee) — jamais reverter.
    function testFuzz_canSend_blockingConditionsAlwaysFalse(uint256 balance, uint256 amount, uint8 blockingCase) public {
        token.setBalance(alice, balance);
        blockingCase = uint8(bound(blockingCase, 0, 2));

        if (blockingCase == 0) token.setPaused(true);
        else if (blockingCase == 1) token.setIsFrozen(alice, true);
        else token.setVerified(alice, false);

        assertFalse(adapter.canSend(alice, 0, amount), "une condition bloquante doit toujours donner false, jamais revert");
    }

    /// @dev Coeur de la divergence assumee n2 (README) : setFrozenTokens
    ///      traduit une quantite CIBLE en delta incremental. Pour toute paire
    ///      (current, target), l'appel doit se traduire par exactement le
    ///      bon freeze/unfreeze, jamais les deux, jamais un montant errone.
    function testFuzz_setFrozenTokens_translatesToExactDelta(uint128 current, uint128 target) public {
        // uint128 plutot que uint256 : evite l'overflow arithmetique du mock
        // (freezePartialTokens fait +=) sans reduire la portee du test — les
        // deltas restent arbitraires sur toute la plage utile.
        token.setFrozenTokens(alice, current);

        adapter.setFrozenTokens(alice, 0, target);

        assertEq(token.getFrozenTokens(alice), target, "la quantite gelee doit atteindre exactement la cible");
    }

    /// @dev Repeter le meme appel (current == target) ne doit produire aucun
    ///      effet observable cote token (voir README : "aucun appel, aucun
    ///      effet").
    function testFuzz_setFrozenTokens_noOpWhenUnchanged(uint128 amount) public {
        token.setFrozenTokens(alice, amount);
        uint256 balanceBefore = token.balanceOf(alice);

        adapter.setFrozenTokens(alice, 0, amount);

        assertEq(token.getFrozenTokens(alice), amount);
        assertEq(token.balanceOf(alice), balanceBefore);
    }

    /// @dev Tout tokenId non nul doit reverter avec UnsupportedTokenId, sur
    ///      les quatre fonctions de lecture ET les deux fonctions d'ecriture
    ///      — jamais silencieusement traite comme 0.
    function testFuzz_fungibleOnly_revertsOnNonZeroTokenId(uint256 tokenId, uint256 amount) public {
        vm.assume(tokenId != 0);

        vm.expectRevert(abi.encodeWithSignature("UnsupportedTokenId(uint256)", tokenId));
        adapter.canSend(alice, tokenId, amount);

        vm.expectRevert(abi.encodeWithSignature("UnsupportedTokenId(uint256)", tokenId));
        adapter.canReceive(bob, tokenId, amount);

        vm.expectRevert(abi.encodeWithSignature("UnsupportedTokenId(uint256)", tokenId));
        adapter.canTransfer(alice, bob, tokenId, amount);

        vm.expectRevert(abi.encodeWithSignature("UnsupportedTokenId(uint256)", tokenId));
        adapter.getFrozenTokens(alice, tokenId);

        vm.expectRevert(abi.encodeWithSignature("UnsupportedTokenId(uint256)", tokenId));
        adapter.setFrozenTokens(alice, tokenId, amount);

        vm.expectRevert(abi.encodeWithSignature("UnsupportedTokenId(uint256)", tokenId));
        adapter.forcedTransfer(alice, bob, tokenId, amount);
    }

    /// @dev getFrozenTokens doit renvoyer le solde ENTIER quand l'adresse est
    ///      totalement gelee (divergence assumee n3), quel que soit le solde
    ///      ou le gel partiel deja enregistre — jamais un melange des deux.
    function testFuzz_getFrozenTokens_totalFreezeReturnsFullBalance(uint256 balance, uint256 partialFrozen) public {
        token.setBalance(alice, balance);
        token.setFrozenTokens(alice, partialFrozen);
        token.setIsFrozen(alice, true);

        assertEq(adapter.getFrozenTokens(alice, 0), balance);
    }

    /// @dev Trouve un vrai bug avant qu'un audit externe ne le fasse : le
    ///      finding Slither/Semgrep corrige (retour de forcedTransfer non
    ///      verifie) doit rester corrige. Si le token sous-jacent renvoie
    ///      false (echec sans revert), l'adaptateur doit reverter et NE PAS
    ///      emettre ForcedTransfer.
    function testFuzz_forcedTransfer_revertsWhenUnderlyingReturnsFalse(uint256 amount) public {
        token.setForcedTransferReturn(false);

        vm.expectRevert(abi.encodeWithSignature("ForcedTransferFailed()"));
        adapter.forcedTransfer(alice, bob, 0, amount);
    }
}
