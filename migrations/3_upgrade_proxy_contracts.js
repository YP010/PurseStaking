const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const PurseStaking = artifacts.require("PurseStaking");
const PurseStakingV2 = artifacts.require("PurseStakingV2");

module.exports = async function (deployer) {
  const purseStaking = await PurseStaking.deployed();
  await upgradeProxy(purseStaking.address, PurseStakingV2, { deployer })

}
