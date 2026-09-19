// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

/// @dev Double controlable pour fuzzer ERC7943Adapter en isolation, sans la
///      lourdeur d'une vraie suite T-REX. Les tests Hardhat (test/adapters/)
///      restent la reference contre un vrai token ; ce mock ne sert qu'a
///      exercer des combinaisons de valeurs que la fixture T-REX ne couvre
///      pas facilement (soldes/gels aux bornes de uint256, etc.).
contract MockERC3643 {
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public getFrozenTokens;
    mapping(address => bool) public isFrozen;
    mapping(address => bool) public verified;
    bool public paused;

    address public identityRegistry;
    address public compliance;

    bool public forcedTransferReturn = true;
    bool public complianceCanTransferReturn = true;

    constructor() {
        identityRegistry = address(new MockIdentityRegistry(this));
        compliance = address(new MockCompliance(this));
    }

    function setBalance(address user, uint256 amount) external {
        balanceOf[user] = amount;
    }

    function setFrozenTokens(address user, uint256 amount) external {
        getFrozenTokens[user] = amount;
    }

    function setIsFrozen(address user, bool value) external {
        isFrozen[user] = value;
    }

    function setVerified(address user, bool value) external {
        verified[user] = value;
    }

    function setPaused(bool value) external {
        paused = value;
    }

    function setForcedTransferReturn(bool value) external {
        forcedTransferReturn = value;
    }

    function setComplianceCanTransferReturn(bool value) external {
        complianceCanTransferReturn = value;
    }

    function freezePartialTokens(address account, uint256 amount) external {
        getFrozenTokens[account] += amount;
    }

    function unfreezePartialTokens(address account, uint256 amount) external {
        getFrozenTokens[account] -= amount;
    }

    function forcedTransfer(address from, address to, uint256 amount) external returns (bool) {
        if (!forcedTransferReturn) return false;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockIdentityRegistry {
    MockERC3643 public immutable token;

    constructor(MockERC3643 _token) {
        token = _token;
    }

    function isVerified(address account) external view returns (bool) {
        return token.verified(account);
    }
}

contract MockCompliance {
    MockERC3643 public immutable token;

    constructor(MockERC3643 _token) {
        token = _token;
    }

    function canTransfer(address, address, uint256) external view returns (bool) {
        return token.complianceCanTransferReturn();
    }
}
