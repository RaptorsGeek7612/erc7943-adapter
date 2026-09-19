// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

/**
 * ============================================================================
 *  ⚠️  ERC-7943 EST UN BROUILLON AU STADE *REVIEW*
 * ============================================================================
 *
 *  Les noms de fonctions de cette proposition ont déjà changé au moins deux
 *  fois publiquement :
 *
 *    version initiale   forceTransfer, setFrozen, getFrozen,
 *                       isUserAllowed, isTransferAllowed
 *    version actuelle   forcedTransfer, setFrozenTokens, getFrozenTokens,
 *                       canSend, canReceive, canTransfer
 *
 *  Le renommage de `forceTransfer` en `forcedTransfer` et de
 *  `isTransferAllowed` en `canTransfer` est explicitement motivé par la
 *  compatibilité ascendante avec ERC-3643 — ce qui est une bonne nouvelle
 *  pour cet adaptateur.
 *
 *  AVANT TOUT USAGE : compare ce fichier à https://eips.ethereum.org/EIPS/eip-7943
 *  Les signatures exactes, l'interfaceId ERC-165 et la forme des erreurs
 *  peuvent encore bouger.
 *
 *  TOUTE la dérive du standard est concentrée ici. L'adaptateur ne référence
 *  que cette interface : si un nom change, un seul fichier est à corriger.
 *  C'est la raison d'être de ce découpage.
 * ============================================================================
 *
 *  Conventions de la proposition pour les jetons fongibles :
 *    tokenId = 0        pour un ERC-20
 *    amount  = 1        pour un ERC-721
 */
interface IERC7943 {

    /// @notice Signale un transfert exécuté sans consentement du porteur.
    event ForcedTransfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount
    );

    /// @notice Signale un changement de quantité gelée.
    event Frozen(address indexed user, uint256 indexed tokenId, uint256 amount);

    error ERC7943CannotSend(address from, uint256 tokenId, uint256 amount);
    error ERC7943CannotReceive(address to, uint256 tokenId, uint256 amount);
    error ERC7943CannotTransfer(address from, address to, uint256 tokenId, uint256 amount);
    error ERC7943InsufficientUnfrozenBalance(
        address user,
        uint256 tokenId,
        uint256 amount,
        uint256 unfrozen
    );

    /// @notice Le compte peut-il émettre ce montant.
    function canSend(address from, uint256 tokenId, uint256 amount)
        external
        view
        returns (bool);

    /// @notice Le compte peut-il recevoir ce montant.
    function canReceive(address to, uint256 tokenId, uint256 amount)
        external
        view
        returns (bool);

    /// @notice Le transfert complet est-il autorisé, règles de conformité incluses.
    function canTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external
        view
        returns (bool);

    /// @notice Quantité gelée, non transférable.
    function getFrozenTokens(address user, uint256 tokenId)
        external
        view
        returns (uint256);

    /// @notice Fixe la quantité gelée. Écrase la valeur précédente.
    /// @dev Accès restreint. La proposition n'impose pas de modèle de rôles.
    function setFrozenTokens(address user, uint256 tokenId, uint256 amount) external;

    /// @notice Transfert exécuté par une autorité, sans consentement du porteur.
    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external;
}
