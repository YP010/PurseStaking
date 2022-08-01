// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IPurseToken {

    function transfer(address to, uint tokens) external returns (bool success);

    function transferFrom(address from, address to, uint tokens) external returns (bool success);

    function balanceOf(address tokenOwner) external view returns (uint balance);

}

contract PurseStaking is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string public name;
    IPurseToken public purseToken;
    uint256 private _totalReceiptSupply;
       
    struct UserInfo {
        uint256 receiptToken;   
    }

    mapping (address => UserInfo) public userInfo;

    function initialize(IPurseToken _purseToken) public initializer {
        purseToken = _purseToken;
        name = "Purse Staking";
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    event Deposit(address indexed _from, uint256 _value);
    event Withdraw(address indexed _from, uint256 _value);

    function enter(uint256 purseAmount) external whenNotPaused returns (bool success) {
        require(purseToken.balanceOf(msg.sender) >= purseAmount, "Insufficient Purse Token");
        
        uint256 totalPurse = purseToken.balanceOf(address(this));
        uint256 totalXPurse = totalReceiptSupply();

        purseToken.transferFrom(msg.sender, address(this), purseAmount);

        if (totalXPurse <= 0 || totalPurse <= 0) {
            require(totalXPurse <= 0, "Total Receipt > 0");
            userInfo[msg.sender].receiptToken = purseAmount;
            _totalReceiptSupply += purseAmount;
        }
        else {
            uint256 newReceipt = purseAmount.mul(totalXPurse).div(totalPurse);
            userInfo[msg.sender].receiptToken += newReceipt;
            _totalReceiptSupply += newReceipt;
        }
        emit Deposit(msg.sender, purseAmount);
        return true;
    }

    function leave(uint256 xPurseAmount) external whenNotPaused returns (bool success){  
        require(userInfo[msg.sender].receiptToken >= xPurseAmount, "Insufficient Receipt Token");
        
        uint256 totalXPurse = totalReceiptSupply();
        uint256 purseAmount = xPurseAmount.mul(purseToken.balanceOf(address(this))).div(totalXPurse);
        
        userInfo[msg.sender].receiptToken -= xPurseAmount;
        _totalReceiptSupply -= xPurseAmount;

        uint256 purseTransfer = safePurseTransfer(purseAmount);
        emit Withdraw(msg.sender, purseTransfer);
        purseToken.transfer(msg.sender, purseTransfer);
        return true;
    }

    function safePurseTransfer(uint256 amount) internal view returns (uint256) {
        uint256 purseBal = purseToken.balanceOf(address(this));
        return amount > purseBal ? purseBal : amount;
    }

    function getTotalPurse(address purseOwner) external view returns (uint256){  
        uint256 totalXPurse = totalReceiptSupply();
        uint256 purseAmount = userInfo[purseOwner].receiptToken.mul(purseToken.balanceOf(address(this))).div(totalXPurse);
        return purseAmount;
    }

    function totalReceiptSupply() public view returns (uint256) {
        return _totalReceiptSupply;
    }

    function recoverToken(address tokenAddress, uint256 amount, address recipient) external onlyOwner {
        require(recipient != address(0), "Send to Zero Address");
        IERC20Upgradeable(tokenAddress).safeTransfer(recipient, amount);
    }
    
    function pause() external whenNotPaused onlyOwner {
        _pause();
    }

    function unpause() external whenPaused onlyOwner {
        _unpause();
    }
}