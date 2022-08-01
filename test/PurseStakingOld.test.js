const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const purseStaking = artifacts.require("PurseStaking");
const purseToken = artifacts.require("PurseTokenUpgradable");

function purse(n) {
  return web3.utils.toWei(n, 'ether');
}

contract("PurseStaking", accounts => {
  beforeEach(async () =>  {
    this.purseTokenInstance = await  deployProxy(purseToken,[accounts[0], accounts[1], 10, 5, 5])
    this.purseStakingInstance = await deployProxy(purseStaking, [this.purseTokenInstance.address])
    await this.purseTokenInstance.updateDPoolAdd(this.purseStakingInstance.address)
    await this.purseTokenInstance.setWhitelistedTo(accounts[0])
    await this.purseTokenInstance.setWhitelistedTo(accounts[1])
    await this.purseTokenInstance.setWhitelistedTo(this.purseStakingInstance.address)
    await this.purseTokenInstance.setWhitelistedFrom(accounts[0])
    await this.purseTokenInstance.setWhitelistedFrom(accounts[1])
    await this.purseTokenInstance.setWhitelistedFrom(this.purseStakingInstance.address)
  })

  it("A stakes 6 purse should fail as balance insufficient", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("6"), {from: accounts[2]}) // Set allowance of 6 purse
    try {
      await this.purseStakingInstance.enter(purse("6"), {from: accounts[2]}) // User A stakes 6 purse
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("A stakes 5 purse should fail as contract is paused", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.pause()
    try {
      await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("A stakes 5 purse should return 5 receipt and 5 purse after unpaused", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    const userABalBef = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABalBef, purse("5"))
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.pause()
    try {
      await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
    await this.purseStakingInstance.unpause()
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    const userABalAft = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABalAft, 0)
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("5"))
    const userAPurseBal = await this.purseStakingInstance.getTotalPurse(accounts[2]) // Get user stake balance
    assert.equal(userAPurseBal, purse("5"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address) // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("5"))
  });

  it("Incoming 10 purse should return 15 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse

    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    const userBal = await this.purseTokenInstance.balanceOf(accounts[4]) //B=20, D=10, L=10
    assert.equal(userBal, purse("19960"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address);  //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("15"))
  });

  it("B stakes 15 purse should return 10 receipt and 30 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})

    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    const userBBalBef = await this.purseTokenInstance.balanceOf(accounts[5])
    assert.equal(userBBalBef, purse("15"))
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    const userBBalAft = await this.purseTokenInstance.balanceOf(accounts[5])
    assert.equal(userBBalAft, 0)
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply()  // Get the total number of receipt 
    assert.equal(receiptSupply, purse("10"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address) // Get total purse in staking contract
    assert.equal(purseStakingBal, purse("30"))
  });

  it("Incoming 10 purse should return 40 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})
    const userBal = await this.purseTokenInstance.balanceOf(accounts[4]) //B=20, D=10, L=10
    assert.equal(userBal, purse("19960"))
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address) //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("40"))
  });

  it("A withdraws 6 receipt should fail to withdraw", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]})    
    try {
      await this.purseStakingInstance.leave(purse("6"), {from: accounts[2]})
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("A withdraws 2 receipt should return 8 purse and 32 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]}) 
    
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[2]}) //A withdraws 2 receipt
    const userABal = await this.purseTokenInstance.balanceOf(accounts[2])
    assert.equal(userABal, purse("8"))
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply();  //Find the total number of receipt 
    assert.equal(receiptSupply, purse("8"));
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address);  //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("32"))
  });

  it("Incoming 18 purse should return 50 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]}) 
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[2]}) //A withdraws 2 receipt

    await this.purseTokenInstance.transfer(accounts[8], purse("36000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("36000"), {from: accounts[8]}) 
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address)  //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("50"))
  });

  it("B withdraws 6 receipt should fail to withdraw", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]}) 
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[2]}) //A withdraws 2 receipt
    await this.purseTokenInstance.transfer(accounts[8], purse("36000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("36000"), {from: accounts[8]})     
    try {
      await this.purseStakingInstance.leave(purse("6"), {from: accounts[5]})
      assert.fail("Should have thrown an error")
    } catch(error) {
      assert.include(error.message, "revert", "The error message should contain revert")
    }
  });

  it("B withdraws 4 receipt should return 25 purse and 25 purse", async () => {
    await this.purseTokenInstance.transfer(accounts[2], purse("5"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("5"), {from: accounts[2]}) // Set allowance of 5 purse
    await this.purseStakingInstance.enter(purse("5"), {from: accounts[2]}) // User A stakes 5 purse
    await this.purseTokenInstance.transfer(accounts[3], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[4], purse("20000"), {from: accounts[3]})
    await this.purseTokenInstance.transfer(accounts[5], purse("15"), {from: accounts[0]})
    await this.purseTokenInstance.approve(this.purseStakingInstance.address, purse("15"), {from: accounts[5]}) // Set allowance of 15 purse
    await this.purseStakingInstance.enter(purse("15"), {from: accounts[5]}) // User B stakes 15 purse
    await this.purseTokenInstance.transfer(accounts[6], purse("20000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[7], purse("20000"), {from: accounts[6]}) 
    await this.purseStakingInstance.leave(purse("2"), {from: accounts[2]}) //A withdraws 2 receipt
    await this.purseTokenInstance.transfer(accounts[8], purse("36000"), {from: accounts[0]})
    await this.purseTokenInstance.transfer(accounts[9], purse("36000"), {from: accounts[8]})   

    await this.purseStakingInstance.leave(purse("4"), {from: accounts[5]}) //B withdraws 4 receipt
    const userBBal = await this.purseTokenInstance.balanceOf(accounts[5]) //B receives 25 purse from staking
    assert.equal(userBBal, purse("25"))
    const receiptSupply = await this.purseStakingInstance.totalReceiptSupply();  //Find the total number of receipt 
    assert.equal(receiptSupply, purse("4"));
    const purseStakingBal = await this.purseTokenInstance.balanceOf(this.purseStakingInstance.address);  //Total balance of purse in purse staking contract
    assert.equal(purseStakingBal, purse("25"))
  });

});

