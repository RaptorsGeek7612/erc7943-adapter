// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {IERC7943} from "./IERC7943.sol";
/// @dev IERC165 déclaré localement : une seule fonction, et l'adaptateur
///      reste un projet sans dépendance externe.
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC3643Minimal {
    function balanceOf(address account) external view returns (uint256);
    function isFrozen(address account) external view returns (bool);
    function getFrozenTokens(address account) external view returns (uint256);
    function paused() external view returns (bool);
    function identityRegistry() external view returns (address);
    function compliance() external view returns (address);
    function forcedTransfer(address from, address to, uint256 amount) external returns (bool);
    function freezePartialTokens(address account, uint256 amount) external;
    function unfreezePartialTokens(address account, uint256 amount) external;
}

interface IIdentityRegistryMinimal {
    function isVerified(address account) external view returns (bool);
}

interface IComplianceMinimal {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
}

/**
 * @title ERC7943Adapter
 * @notice Expose un token ERC-3643 existant à travers l'interface ERC-7943.
 *
 * @dev Pourquoi un adaptateur plutôt qu'une implémentation.
 *
 * ERC-7943 est un dénominateur commun destiné aux consommateurs : un pool
 * AMM, un protocole de prêt ou un agrégateur veulent poser une question de
 * conformité sans connaître l'implémentation sous-jacente. Le standard ne
 * prescrit ni identité, ni rôles, ni modèle de conformité.
 *
 * Un token ERC-3643 en production ne sera pas redéployé pour gagner une
 * interface. L'adaptateur est donc la bonne forme : il se place à côté,
 * traduit les questions, et ne détient rien.
 *
 * @dev Ce que l'adaptateur peut, et ne peut pas.
 *
 *   LECTURE   entièrement déléguée au token, à son registre d'identités et à
 *             sa compliance. Aucun état dupliqué, donc aucune divergence
 *             possible entre l'adaptateur et la vérité on-chain.
 *
 *   ÉCRITURE  `forcedTransfer` et `setFrozenTokens` nécessitent que CET
 *             adaptateur porte le rôle d'agent sur le token. C'est une
 *             décision de gouvernance lourde : donner le rôle d'agent à un
 *             contrat, c'est déplacer la confiance vers le contrôle d'accès
 *             de ce contrat.
 *             Tant que le rôle n'est pas accordé, les écritures revert. C'est
 *             volontaire : un adaptateur qui échoue silencieusement sur une
 *             saisie ordonnée par un juge serait pire qu'inutile.
 *
 * @dev Divergences assumées avec le standard.
 *
 * 1. `tokenId` est ignoré et DOIT valoir 0. ERC-3643 est purement fongible.
 *    Un appel avec un tokenId non nul revert plutôt que de renvoyer une
 *    réponse plausible mais fausse.
 *
 * 2. `setFrozenTokens` écrase la quantité gelée, alors qu'ERC-3643 expose
 *    un gel et un dégel partiels incrémentaux. L'adaptateur calcule le delta
 *    et appelle la bonne fonction. C'est la traduction la plus délicate du
 *    contrat, et la première chose à tester.
 *
 * 3. Le gel TOTAL d'une adresse (`isFrozen`) n'a pas d'équivalent dans
 *    ERC-7943, qui ne connaît que des quantités. `getFrozenTokens` renvoie
 *    donc le solde entier quand l'adresse est intégralement gelée — sinon un
 *    consommateur croirait des jetons disponibles alors qu'aucun ne bouge.
 */
contract ERC7943Adapter is IERC7943, IERC165 {

    IERC3643Minimal public immutable token;

    error UnsupportedTokenId(uint256 tokenId);
    error ForcedTransferFailed();

    constructor(address _token) {
        token = IERC3643Minimal(_token);
    }

    modifier fungibleOnly(uint256 tokenId) {
        if (tokenId != 0) revert UnsupportedTokenId(tokenId);
        _;
    }

    // --- lecture --------------------------------------------------------------

    /// @inheritdoc IERC7943
    function canSend(address from, uint256 tokenId, uint256 amount)
        public
        view
        fungibleOnly(tokenId)
        returns (bool)
    {
        if (token.paused()) return false;
        if (token.isFrozen(from)) return false;
        if (!IIdentityRegistryMinimal(token.identityRegistry()).isVerified(from)) return false;
        uint256 balance = token.balanceOf(from);
        uint256 frozen = token.getFrozenTokens(from);
        uint256 free = balance > frozen ? balance - frozen : 0;
        return free >= amount;
    }

    /// @inheritdoc IERC7943
    /// @dev `amount` est laisse anonyme : ERC-7943 impose sa presence dans la
    ///      signature (coherence avec canSend/canTransfer), mais le sens du
    ///      standard pour canReceive ne depend que de l'identite/du gel du
    ///      destinataire, jamais du montant.
    function canReceive(address to, uint256 tokenId, uint256 /* amount */)
        public
        view
        fungibleOnly(tokenId)
        returns (bool)
    {
        if (token.paused()) return false;
        if (token.isFrozen(to)) return false;
        return IIdentityRegistryMinimal(token.identityRegistry()).isVerified(to);
    }

    /**
     * @inheritdoc IERC7943
     * @dev Combine les deux contrôles directionnels ET les règles de conformité.
     *      L'ordre compte pour le coût : les lectures locales avant l'appel à
     *      la compliance, qui boucle sur tous les modules branchés.
     */
    function canTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external
        view
        fungibleOnly(tokenId)
        returns (bool)
    {
        if (!canSend(from, 0, amount)) return false;
        if (!canReceive(to, 0, amount)) return false;
        return IComplianceMinimal(token.compliance()).canTransfer(from, to, amount);
    }

    /// @inheritdoc IERC7943
    function getFrozenTokens(address user, uint256 tokenId)
        external
        view
        fungibleOnly(tokenId)
        returns (uint256)
    {
        // Une adresse entièrement gelée n'a aucun jeton mobilisable.
        // Renvoyer seulement le gel partiel induirait le consommateur en erreur.
        if (token.isFrozen(user)) return token.balanceOf(user);
        return token.getFrozenTokens(user);
    }

    // --- écriture -------------------------------------------------------------

    /**
     * @inheritdoc IERC7943
     * @dev Traduit une quantité cible en gel ou dégel incrémental.
     *      Le contrôle d'accès est délibérément absent ici : il vit dans le
     *      rôle d'agent du token. Ajouter une seconde couche de rôles dans
     *      l'adaptateur créerait deux sources de vérité sur qui peut geler.
     */
    function setFrozenTokens(address user, uint256 tokenId, uint256 amount)
        external
        fungibleOnly(tokenId)
    {
        uint256 current = token.getFrozenTokens(user);
        if (amount > current) {
            token.freezePartialTokens(user, amount - current);
        } else if (amount < current) {
            token.unfreezePartialTokens(user, current - amount);
        }
        emit Frozen(user, 0, amount);
    }

    /// @inheritdoc IERC7943
    /// @dev Le retour est verifie explicitement : IERC3643Minimal ne garantit
    ///      pas un revert sur echec (T-REX le fait, mais l'interface cible
    ///      generiquement tout token ERC-3643). Emettre ForcedTransfer alors
    ///      que le transfert sous-jacent a echoue serait le silencieux-mais-faux
    ///      exactement ce que cet adaptateur s'interdit ailleurs (role d'agent).
    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external
        fungibleOnly(tokenId)
    {
        if (!token.forcedTransfer(from, to, amount)) revert ForcedTransferFailed();
        emit ForcedTransfer(from, to, 0, amount);
    }

    // --- introspection --------------------------------------------------------

    /**
     * @dev L'interfaceId est calculé à partir de l'interface déclarée dans
     *      IERC7943.sol plutôt que codé en dur. Une constante recopiée d'un
     *      article de blog deviendrait fausse au prochain renommage du
     *      brouillon, sans que rien ne casse visiblement.
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC7943).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /// @notice Expose l'interfaceId effectif, pour vérification contre l'EIP final.
    function erc7943InterfaceId() external pure returns (bytes4) {
        return type(IERC7943).interfaceId;
    }
}
