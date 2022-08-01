# Purse Staking
1. npm install
2. npm start

Project is using BSC Testnet and can be viewed here: https://purse-staking.netlify.app/

## Mechanism
- Users will receive an amount of share whenever they stake.
  - Share Received = User Staked PURSE / Total Staked PURSE x Total Share Amount
- To withdraw PURSE, they are required to use the share they owned to withdraw an equivalent amount of PURSE.
  -  PURSE Withdrawn = Share Withdrawal Amount / Total Share Amount x Total Staked PURSE.
  
## 21-Day Lock
Users that stake into this upgraded contract, will receive locked share in return. A 21-Day Lock will be imposed if they un-stake their PURSE using locked share and they can only withdraw their staked PURSE with reward after the 21-Day Lock period.

### Withdrawing PURSE using Locked Share
- If users un-stake the PURSE using locked share when there’s already an existing un-staking entry, the lock period will reset back to 21 days. In addition, the un-staked PURSE will not earn any reward during this 21-Day period.
- For users who have unclaimed PURSE with reward after the 21-Day period, they will have to withdraw it manually or it will be withdrawn automatically when users un-stake.

### Withdrawing PURSE using Unlocked Share
- For the share that users have received when staking into the previous non-upgraded contract, they will be able to withdraw the original staked PURSE with reward anytime without the 21-Day Lock.

### Withdrawing PURSE using both Unlocked and Locked Share
- The PURSE for unlocked share will be withdrawn out first without the 21-Day Lock and the remaining PURSE for locked share will be un-staked and locked for 21 days.

#### Example:
1. Alice has a total of 10 Share (5 Unlocked Share and 5 Locked Share)
2. Alice un-stake 8 Share (5 Unlocked Share and 3 Locked Share)
3. PURSE for the 5 Unlocked Share will be transferred instantly to Alice and remaining PURSE for Locked Share will be locked for 21 days.