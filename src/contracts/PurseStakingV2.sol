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

contract PurseStakingV2 is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    using SafeMath for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    string public name;
    IPurseToken public purseToken;
    uint256 private _totalReceiptSupply;
       
    struct UserInfo {
        uint256 receiptToken;
        uint256 newReceiptToken;
        uint256 withdrawReward;
        uint256 lockTime;
    }

    mapping (address => UserInfo) public userInfo;

    uint256 private _totalLockedAmount;
    uint256 public lockPeriod;

    function initialize(IPurseToken _purseToken) public initializer {
        purseToken = _purseToken;
        name = "Purse Staking";
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    event Deposit(address indexed _from, uint256 _value);
    event WithdrawUnlockedStake(address indexed _from, uint256 _value);
    event WithdrawLockedStake(address indexed _from, uint256 _value);

    function enter(uint256 purseAmount) external whenNotPaused returns (bool success) {
        require(purseToken.balanceOf(msg.sender) >= purseAmount, "Insufficient Purse Token");
        
        uint256 totalXPurse = totalReceiptSupply();
        uint256 totalPurse = availablePurseSupply();

        purseToken.transferFrom(msg.sender, address(this), purseAmount);

        if (totalXPurse <= 0 || totalPurse <= 0) {
            require(totalXPurse <= 0, "Total Receipt > 0");
            userInfo[msg.sender].newReceiptToken = purseAmount;
            _totalReceiptSupply += purseAmount;
        }
        else {
            uint256 newReceipt = purseAmount.mul(totalXPurse).div(totalPurse);
            userInfo[msg.sender].newReceiptToken += newReceipt;
            _totalReceiptSupply += newReceipt;
        }
        emit Deposit(msg.sender, purseAmount);
        return true;
    }

    function leave(uint256 xPurseAmount) external whenNotPaused returns (bool success){
        UserInfo storage user = userInfo[msg.sender];
        uint256 userReceipt = userReceiptToken(msg.sender);
        uint256 totalXPurse = totalReceiptSupply();
        uint256 totalPurse = availablePurseSupply();
        uint256 purseAmount;
        uint256 purseReward;
        require(userReceipt >= xPurseAmount, "Insufficient Receipt Token");

        if(user.receiptToken <= 0) {
            uint256 lockDuration = block.timestamp.sub(user.lockTime); 
            if (lockDuration >= lockPeriod && user.lockTime != 0) {
                withdrawLockedAmount();
            }
            purseReward = xPurseAmount.mul(totalPurse).div(totalXPurse);
            user.newReceiptToken -= xPurseAmount;
            handleReceipt(purseReward);
        } else {
            if(xPurseAmount > user.receiptToken) {
                uint256 newReceipt = xPurseAmount.sub(user.receiptToken);
                purseReward = newReceipt.mul(totalPurse).div(totalXPurse);
                purseAmount = user.receiptToken.mul(totalPurse).div(totalXPurse);
                user.newReceiptToken -= newReceipt;
                user.receiptToken = 0;
                handleReceipt(purseReward);
            } else {
                purseAmount = xPurseAmount.mul(totalPurse).div(totalXPurse);
                user.receiptToken -= xPurseAmount;
            }
            uint256 purseTransfer = safePurseTransfer(purseAmount);
            emit WithdrawUnlockedStake(msg.sender, purseTransfer);
            purseToken.transfer(msg.sender, purseTransfer);
        }
        _totalReceiptSupply -= xPurseAmount;
        return true;
    }

    function handleReceipt(uint256 _purseReward) internal {
        UserInfo storage user = userInfo[msg.sender];             
        user.withdrawReward += _purseReward;
        user.lockTime = block.timestamp;
        _totalLockedAmount += _purseReward;
    }

    function updateLockPeriod(uint256 newLockPeriod) external onlyOwner {
        require(newLockPeriod != lockPeriod, "Same as Previous Lock Period");
        lockPeriod = newLockPeriod;
    }

    function withdrawLockedAmount() public whenNotPaused returns (bool success){
        UserInfo storage user = userInfo[msg.sender];
        uint256 lockDuration = block.timestamp.sub(user.lockTime); 
        require(user.withdrawReward > 0, "Insufficient Withdrawal Amount");
        require(lockDuration >= lockPeriod && user.lockTime != 0, "Lock Time < Lock Period and/or Lock Time == 0");

        uint256 purseTransfer = safePurseTransfer(user.withdrawReward);
        _totalLockedAmount -= user.withdrawReward;
        user.withdrawReward = 0;
        user.lockTime = 0;

        emit WithdrawLockedStake(msg.sender, purseTransfer);
        purseToken.transfer(msg.sender, purseTransfer);
        return true;
    }

    function safePurseTransfer(uint256 amount) internal view returns (uint256) {
        uint256 totalPurse = availablePurseSupply();
        return amount > totalPurse ? totalPurse : amount;
    }

    function getTotalPurse(address purseOwner) external view returns (uint256){  
        uint256 totalXPurse = totalReceiptSupply();
        uint256 totalPurse = availablePurseSupply();
        uint256 userReceipt = userReceiptToken(purseOwner);
        uint256 purseAmount = userReceipt.mul(totalPurse).div(totalXPurse);
        return purseAmount;
    }

    function userReceiptToken(address purseOwner) public view returns (uint256) {
        return userInfo[purseOwner].receiptToken.add(userInfo[purseOwner].newReceiptToken);
    }

    function totalLockedAmount() public view returns (uint256) {
        return _totalLockedAmount;
    }

    function availablePurseSupply() public view returns (uint256) {
        return purseToken.balanceOf(address(this)).sub(totalLockedAmount());
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