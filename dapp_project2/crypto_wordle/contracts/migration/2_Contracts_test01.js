const Contacts = artifacts.require("./Contracts_test01.sol");

module.exports = function(deployer) {
  deployer.deploy(Contacts);
};