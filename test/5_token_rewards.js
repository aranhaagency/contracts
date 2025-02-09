require("dotenv").config();

const config = require('../config.json');
const { expect } = require('chai');
const { waffle } = require("hardhat");
const provider = waffle.provider;
const abi = require('human-standard-token-abi');
const { setupContracts, log, mineBlocks } = require('./helper');
const addr = config.addresses;

describe('Re-deploying the plexus ecosystem for Token Rewards test', () => {

  // Global test vars
  let wrapper, wrapperSushi, tokenRewards, plexusOracle, tier1Staking, core, tier2Farm, tier2Aave, tier2Pickle, plexusCoin, owner, addr1;
  let netinfo;
  let network = 'unknown';
  let daiTokenAddress;
  let farmTokenAddress;
  let pickleTokenAddress;
  let wethAddress;
  const unitAmount = "2";

  // Deploy and setup the contracts
  before(async () => {
    const { deployedContracts } = await setupContracts();
    wrapper = deployedContracts.wrapper;
    wrapperSushi = deployedContracts.wrapperSushi;
    tokenRewards = deployedContracts.tokenRewards;
    plexusOracle = deployedContracts.plexusOracle;
    tier1Staking = deployedContracts.tier1Staking;
    core = deployedContracts.core;
    tier2Farm = deployedContracts.tier2Farm;
    tier2Aave = deployedContracts.tier2Aave;
    tier2Pickle = deployedContracts.tier2Pickle;
    plexusCoin = deployedContracts.plexusCoin;
    owner = deployedContracts.owner;
    addr1 = deployedContracts.addr1;

    netinfo = await ethers.provider.getNetwork();
    network = netinfo.chainId === 1 ? "mainnet" :
    netinfo.chainId === 42 ? "kovan" :
    netinfo.chainId === 56 ? "binance" :
    netinfo.chainId === 137 ? "matic" : 'mainnet';
    daiTokenAddress = addr.tokens.DAI[network];
    farmTokenAddress = addr.tokens.FARM[network];
    pickleTokenAddress = addr.tokens.PICKLE[network];
    wethAddress = addr.tokens.WETH[network];

    // Use contract as user/addr1
    coreAsSigner1 = core.connect(addr1);
  });

  describe('Plexus Token Rewards Deposit Transactions', () => {

    // we'll always need the user ETH balance to be greater than 10 ETH, because we atleast 6 ETH as the base amount for token conversions e.t.c
    it('Plexus test user wallet balance is greater than 10 ETH', async () => {
      const ethbalance = Number(ethers.utils.formatEther(await addr1.getBalance()));
      log('User ETH balance is ', ethbalance);
      expect(ethbalance).to.be.gt(10);
    });

    // Add tokens to reward whitelist
    it('ERC 20 Tokens must be whitelisted for token rewards', async () => {
      const res1 = await(await tokenRewards.addTokenToWhitelist(farmTokenAddress)).wait();
      const res2 = await(await tokenRewards.addTokenToWhitelist(daiTokenAddress)).wait();
      const res3 = await(await tokenRewards.addTokenToWhitelist(pickleTokenAddress)).wait();

      expect(res1.status).to.be.equal(1);
      expect(res2.status).to.be.equal(1);
      expect(res3.status).to.be.equal(1);

    });

    // Conversions From ETH
    it('Should convert 2 ETH to Farm token from harvest.finance', async () => {

      const zeroAddress = process.env.ZERO_ADDRESS;
      const userSlippageTolerance = process.env.SLIPPAGE_TOLERANCE;
      const erc20 = new ethers.Contract(farmTokenAddress, abi, provider);

      // Please note, the number of farm tokens we want to get doesn't matter, so the unit amount is just a placeholder
      const amountPlaceholder = ethers.utils.parseEther(unitAmount)

      // We send 2 ETH to the wrapper for conversion
      let overrides = {
        value: ethers.utils.parseEther("2")
      };

      // Do the conversion as addr1 user
      let coreAsSigner1 = core.connect(addr1);

      // Convert the 2 ETH to Farm Token(s)
      const deadline = Math.floor(new Date().getTime() / 1000) + 10;
      const paths = [[wethAddress, farmTokenAddress]];
      const { status } = await (await coreAsSigner1.convert(zeroAddress, [farmTokenAddress], paths, amountPlaceholder, userSlippageTolerance, deadline, overrides)).wait();

      // Check if the txn is successful
      expect(status).to.equal(1);

      // Check conversion is successful
      if (status === 1) {

         // Check the farm token balance in the contract account
         const userFarmTokenBalance = Number(ethers.utils.formatUnits(await erc20.balanceOf(addr1.address), `ether`));

         // Check if the conversion is successful and the user has some farm tokens their wallet
         log("User farm token balance AFTER ETH conversion: ", userFarmTokenBalance);
         expect(userFarmTokenBalance).to.be.gt(0);

      }
      // Check that the users ETH balance has reduced regardless of the conversion status
      const ethbalance = Number(ethers.utils.formatEther(await addr1.getBalance()));
      log('User ETH balance AFTER ETH conversion is: ', ethbalance);
      expect(ethbalance).to.be.lt(10000);

    });

    it('Should convert 2 ETH to DAI Token from MakerDao', async () => {

      const zeroAddress = process.env.ZERO_ADDRESS;
      const userSlippageTolerance = process.env.SLIPPAGE_TOLERANCE;
      const erc20 = new ethers.Contract(daiTokenAddress, abi, provider);

      // Please note, the number of dai tokens we want to get doesn't matter, so the unit amount is just a placeholder
      const amountPlaceholder = ethers.utils.parseEther(unitAmount)

      // We send 2 ETH to the wrapper for conversion
      let overrides = {
           value: ethers.utils.parseEther("2")
      };

      // Do the conversion as addr1 user
      let coreAsSigner1 = core.connect(addr1);

      // Convert the 2 ETH to Dai Token(s)
      const deadline = Math.floor(new Date().getTime() / 1000) + 10;
      const paths = [[wethAddress, daiTokenAddress]];
      const { status } = await (await coreAsSigner1.convert(zeroAddress, [daiTokenAddress], paths, amountPlaceholder, userSlippageTolerance, deadline, overrides)).wait();

      // Check if the txn is successful
      expect(status).to.equal(1);

      // Check conversion is successful
      if (status === 1) {

         // Check the dai token balance in the contract account
         const userDaiTokenBalance = Number(ethers.utils.formatUnits(await erc20.balanceOf(addr1.address), `ether`));

         // Check if the conversion is successful and the user has some dai tokens in their wallet
         log("User DAI Token balance AFTER ETH conversion: ", userDaiTokenBalance);
         expect(userDaiTokenBalance).to.be.gt(0);

      }
      // Check that the users ETH balance has reduced regardless of the conversion status
      const ethbalance = Number(ethers.utils.formatEther(await addr1.getBalance()));
      log('User ETH balance AFTER ETH conversion is: ', ethbalance);
      expect(ethbalance).to.be.lt(10000);

    });

    it('Should convert 2 ETH to Pickle Token', async () => {

      const zeroAddress = process.env.ZERO_ADDRESS;
      const userSlippageTolerance = process.env.SLIPPAGE_TOLERANCE;
      const erc20 = new ethers.Contract(pickleTokenAddress, abi, provider);

      // Please note, the number of pickle tokens we want to get doesn't matter, so the unit amount is just a placeholder
      const amountPlaceholder = ethers.utils.parseEther(unitAmount)

      // We send 2 ETH to the wrapper for conversion
      let overrides = {
           value: ethers.utils.parseEther("2")
      };

      // Do the conversion as addr1 user
      let coreAsSigner1 = core.connect(addr1);

      // Convert the 2 ETH to Pickle Token(s)
      const deadline = Math.floor(new Date().getTime() / 1000) + 10;
      const paths = [[wethAddress, pickleTokenAddress]];
      const { status } = await (await coreAsSigner1.convert(zeroAddress, [pickleTokenAddress], paths, amountPlaceholder, userSlippageTolerance, deadline, overrides)).wait();

      // Check if the txn is successful
      expect(status).to.equal(1);

      // Check conversion is successful
      if (status === 1) {

         // Check the pickle token balance in the contract account
         const userPickleTokenBalance = Number(ethers.utils.formatUnits(await erc20.balanceOf(addr1.address), `ether`));

         // Check if the conversion is successful and the user has some pickle tokens in their wallet
         log("User pickle token balance AFTER ETH conversion: ", userPickleTokenBalance);
         expect(userPickleTokenBalance).to.be.gt(0);

      }
      // Check that the users ETH balance has reduced regardless of the conversion status
      const ethbalance = Number(ethers.utils.formatEther(await addr1.getBalance()));
      log('User ETH balance AFTER ETH conversion is: ', ethbalance);
      expect(ethbalance).to.be.lt(10000);

    });

    // Plexus Coin Checks
    it('Plexus reward token supply should be greater than or equal to 100,000', async () => {
      const erc20 = new ethers.Contract(plexusCoin.address, abi, provider);

      // Check the plexus coin total supply
      const plexusTokenBalance = Number(ethers.utils.formatUnits(await erc20.balanceOf(owner.address), `ether`));
      log("Plexus token balance is: ",  plexusTokenBalance);

      expect(plexusTokenBalance).to.be.gte(100000);
    });

    it('95,000 plexus reward token should be transferred to the Token Rewardss Contract', async () => {
      // Do the transfer as owner
      const erc20 = new ethers.Contract(plexusCoin.address, abi, owner);
      const transferAmount = ethers.utils.parseEther("950000")
      const { status } = await(await erc20.transfer(tokenRewards.address, transferAmount)).wait();

      // Check if the transfer txn is successful
      expect(status).to.equal(1);
    });

    it('Token rewards should be based on APR defined by the Plexus sAdmin', async () => {
        // set an APR of 40% for all tokens
        const APR = 40000;
        const res1 = await(await tokenRewards.updateAPR(APR, farmTokenAddress)).wait();
        const res2 = await(await tokenRewards.updateAPR(APR, daiTokenAddress)).wait();
        const res3 = await(await tokenRewards.updateAPR(APR, pickleTokenAddress)).wait();

        expect(res1.status).to.be.equal(1);
        expect(res2.status).to.be.equal(1);
        expect(res3.status).to.be.equal(1);

        if (res1.status === 1 && res2.status === 1 && res3.status === 1) {
          const farmAPR = Number(ethers.utils.formatUnits(await tokenRewards.tokenAPRs(farmTokenAddress), 'wei'));
          const daiAPR = Number(ethers.utils.formatUnits(await tokenRewards.tokenAPRs(daiTokenAddress), 'wei'));
          const pickleAPR = Number(ethers.utils.formatUnits(await tokenRewards.tokenAPRs(pickleTokenAddress), 'wei'));

          expect(farmAPR).to.be.equal(APR);
          expect(daiAPR).to.be.equal(APR);
          expect(pickleAPR).to.be.equal(APR);

          log("Farm Token APR is: ", farmAPR);
          log("DAI Token APR is: ", daiAPR);
          log("Pickle Token APR is: ", pickleAPR);

        }
    });

    // Deposit tokens to Plexus
    it("User should be able to deposit Farm Tokens via the core contract", async () => {

        const farmTokenDepositAmount = ethers.utils.parseEther(unitAmount);
        const tier2ContractName = "FARM";
        const erc20 = new ethers.Contract(farmTokenAddress, abi, provider);

        // Check the user farm token balance in the token contract before deposit
        const initialUserFarmTokenBalance = Number(ethers.utils.formatEther(await erc20.balanceOf(addr1.address)));
        log("User farm token balance, BEFORE deposit is: ", initialUserFarmTokenBalance);

        // Approve the core contract to spend the tokens
        let erc20AsSigner1 =  erc20.connect(addr1);
        const approved = await(await erc20AsSigner1.approve(core.address, farmTokenDepositAmount)).wait();

        // Check if the approved txn is successful
        expect(approved.status).to.equal(1);

        // Check allowance
        const allowance = Number(ethers.utils.formatEther(await erc20.allowance(addr1.address, core.address)));
        log("Farm tokens approved by user for deposit : ", allowance);

        // Then we deposit 2 Farm Tokens into the core contract as addr1/user
        const deposit = await (await coreAsSigner1.deposit(tier2ContractName, farmTokenAddress, farmTokenDepositAmount)).wait();

        // Check if the deposit txn is successful
        expect(deposit.status).to.equal(1);

        // If txn is successful
        if (deposit.status) {

          // Check the user farm token balance in the contract account after deposit
          const currUserFarmTokenBalance = Number(ethers.utils.formatEther(await erc20.balanceOf(addr1.address)));
          log("User farm token balance, AFTER deposit is: ", currUserFarmTokenBalance);

          // Check that the initial user Farm token balance is less 2 Tokens
          expect(currUserFarmTokenBalance).to.be.lt(initialUserFarmTokenBalance);

        }

    });

    it("User should be able to deposit DAI Tokens via the core contract", async () => {

        const daiTokenDepositAmount = ethers.utils.parseEther(unitAmount);
        const tier2ContractName = "DAI";
        const erc20 = new ethers.Contract(daiTokenAddress, abi, provider);

        // Check the user dai token balance in the token contract before deposit
        const initialUserDaiTokenBalance = Number(ethers.utils.formatEther(await erc20.balanceOf(addr1.address)));
        log("User DAI Token balance, BEFORE deposit is: ", initialUserDaiTokenBalance);

        // Approve the core contract to spend the tokens
        let erc20AsSigner1 =  erc20.connect(addr1);
        const approved = await(await erc20AsSigner1.approve(core.address, daiTokenDepositAmount)).wait();

        // Check if the approved txn is successful
        expect(approved.status).to.equal(1);

        // Check allowance
        const allowance = Number(ethers.utils.formatEther(await erc20.allowance(addr1.address, core.address)));
        log("DAI Tokens approved by user for deposit : ", allowance);

        // Then we deposit 2 Dai Tokens into the core contract as addr1/user
        const deposit = await (await coreAsSigner1.deposit(tier2ContractName, daiTokenAddress, daiTokenDepositAmount)).wait();

        // Check if the deposit txn is successful
        expect(deposit.status).to.equal(1);

        // If txn is successful
        if (deposit.status) {
          // Check the user dai token balance in their account after deposit
          const currUserDaiTokenBalance = Number(ethers.utils.formatEther(await erc20.balanceOf(addr1.address)));
          log("User DAI token balance, AFTER deposit is: ", currUserDaiTokenBalance);

          // Check that the initial user Dai token balance is less 2 Tokens
          expect(currUserDaiTokenBalance).to.be.lt(initialUserDaiTokenBalance);

        }

    });

    it("User should be able to deposit Pickle Tokens via the core contract", async () => {

        const pickleTokenDepositAmount = ethers.utils.parseEther(unitAmount);
        const tier2ContractName = "PICKLE";
        const erc20 = new ethers.Contract(pickleTokenAddress, abi, provider);

        // Check the user pickle token balance in the token contract before deposit
        const initialUserPickleTokenBalance = Number(ethers.utils.formatEther(await erc20.balanceOf(addr1.address)));
        log("User pickle token balance, BEFORE deposit is: ", initialUserPickleTokenBalance);

        // Approve the core contract to spend the tokens
        let erc20AsSigner1 =  erc20.connect(addr1);
        const approved = await(await erc20AsSigner1.approve(core.address, pickleTokenDepositAmount)).wait();

        // Check if the approved txn is successful
        expect(approved.status).to.equal(1);

        // Check allowance
        const allowance = Number(ethers.utils.formatEther(await erc20.allowance(addr1.address, core.address)));
        log("Pickle tokens approved by user for deposit : ", allowance);

        // Then we deposit 2 Pickle Tokens into the core contract as addr1/user
        const deposit = await (await coreAsSigner1.deposit(tier2ContractName, pickleTokenAddress, pickleTokenDepositAmount)).wait();

        // Check if the deposit txn is successful
        expect(deposit.status).to.equal(1);

        // If txn is successful
        if (deposit.status) {

          // Check the user pickle token balance in the contract account after deposit
          const currUserPickleTokenBalance = Number(ethers.utils.formatEther(await erc20.balanceOf(addr1.address)));
          log("User pickle token balance, AFTER deposit is: ", currUserPickleTokenBalance);

          // Check that the initial user Pickle token balance is less 2 Tokens
          expect(currUserPickleTokenBalance).to.be.lt(initialUserPickleTokenBalance);

        }

    });

  });

  describe('Plexus Token Rewards Withdraw Transactions', () => {

    // Make sure 10 blocks have been mined before token withdrawal
    before(async () => {
      log("Mining 10 blocks before withdrawing tokens.", "");
      await mineBlocks(10);
      log("Block mining is done!", "");
    });

    // Withdraw tokens from Plexus + Token Rewards based on the set APR
    it('User should be able to withdraw deposited Farm tokens + PLX Token Rewards via the Core Contract', async () => {

      const farmTokenWithdrawAmount = ethers.utils.parseEther(unitAmount);
      const erc20Farm = new ethers.Contract(farmTokenAddress, abi, provider);
      const erc20PlexusCoin = new ethers.Contract(plexusCoin.address, abi, provider);
      const tier2ContractName = "FARM";

      // Check the user's Farm Token balance in the token contract before withdrawal
      const initialUserFarmTokenBalance = Number(ethers.utils.formatEther(await erc20Farm.balanceOf(addr1.address)));
      log("User's Farm Token balance, BEFORE withdrawal is: ", initialUserFarmTokenBalance);

      // Check the user's Plexus Coin Reward Token balance in the token contract before withdrawal
      const initialUserPlexusTokenBalance = Number(ethers.utils.formatEther(await erc20PlexusCoin.balanceOf(addr1.address)));
      log("User's Plexus Token balance, BEFORE Farm Token withdrawal is: ", initialUserPlexusTokenBalance);

      // We withdraw Farm Tokens from the core contract as addr1/user
      const { status } = await (await coreAsSigner1.withdraw(tier2ContractName, farmTokenAddress, farmTokenWithdrawAmount)).wait();

      // Check if the withdraw txn is successful
      expect(status).to.equal(1);

      // Check if txn is successful
      if (status) {

        // Check the user farm token balance in the contract account after withdrawal
        const currUserFarmTokenBalance = Number(ethers.utils.formatEther(await erc20Farm.balanceOf(addr1.address)));
        log("User Farm Token balance, AFTER withdrawal is: ", currUserFarmTokenBalance);

        // Check that the initial user Farm Token balance is less than the current token balance
        expect(currUserFarmTokenBalance).to.be.gte(initialUserFarmTokenBalance);

        // Check the user Plexus Reward Token balance in the contract account after withdrawal
        const currUserPlexusTokenBalance = Number(ethers.utils.formatEther(await erc20PlexusCoin.balanceOf(addr1.address)));
        log("User Plexus Reward Token balance, AFTER Farm Token withdrawal is: ", currUserPlexusTokenBalance);

        // Check that the initial user Plexus Token balance is less than the current token balance
        expect(currUserPlexusTokenBalance).to.be.gte(initialUserPlexusTokenBalance);

      }

    });

     // Withdraw tokens from Plexus + Token Rewards based on the set APR
    it('User should be able to withdraw deposited DAI tokens + PLX Token Rewards via the Core Contract', async () => {

      const daiTokenWithdrawAmount = ethers.utils.parseEther(unitAmount);
      const erc20Farm = new ethers.Contract(daiTokenAddress, abi, provider);
      const erc20PlexusCoin = new ethers.Contract(plexusCoin.address, abi, provider);
      const tier2ContractName = "DAI";

      // Check the user's DAI Token balance in the token contract before withdrawal
      const initialUserDAITokenBalance = Number(ethers.utils.formatEther(await erc20Farm.balanceOf(addr1.address)));
      log("User's DAI Token balance, BEFORE withdrawal is: ", initialUserDAITokenBalance);

      // Check the user's Plexus Coin Reward Token balance in the token contract before withdrawal
      const initialUserPlexusTokenBalance = Number(ethers.utils.formatEther(await erc20PlexusCoin.balanceOf(addr1.address)));
      log("User's Plexus Token balance, BEFORE DAI Token withdrawal is: ", initialUserPlexusTokenBalance);

      // We withdraw DAI Tokens from the core contract as addr1/user
      const { status } = await (await coreAsSigner1.withdraw(tier2ContractName, daiTokenAddress, daiTokenWithdrawAmount)).wait();

      // Check if the withdraw txn is successful
      expect(status).to.equal(1);

      // Check if txn is successful
      if (status) {

        // Check the user DAI token balance in the contract account after withdrawal
        const currUserDAITokenBalance = Number(ethers.utils.formatEther(await erc20Farm.balanceOf(addr1.address)));
        log("User DAI Token balance, AFTER withdrawal is: ", currUserDAITokenBalance);

        // Check that the initial user DAI Token balance is less than the current token balance
        expect(currUserDAITokenBalance).to.be.gte(initialUserDAITokenBalance);

        // Check the user Plexus Reward Token balance in the contract account after withdrawal
        const currUserPlexusTokenBalance = Number(ethers.utils.formatEther(await erc20PlexusCoin.balanceOf(addr1.address)));
        log("User Plexus Reward Token balance, AFTER DAI Token withdrawal is: ", currUserPlexusTokenBalance);

        // Check that the initial user Plexus Token balance is less than the current token balance
        expect(currUserPlexusTokenBalance).to.be.gte(initialUserPlexusTokenBalance);

      }

    });

     // Withdraw tokens from Plexus + Token Rewards based on the set APR
     it('User should be able to withdraw deposited DAI tokens + PLX Token Rewards via the Core Contract', async () => {

      const pickleTokenWithdrawAmount = ethers.utils.parseEther(unitAmount);
      const erc20Farm = new ethers.Contract(pickleTokenAddress, abi, provider);
      const erc20PlexusCoin = new ethers.Contract(plexusCoin.address, abi, provider);
      const tier2ContractName = "PICKLE";

      // Check the user's Pickle Token balance in the token contract before withdrawal
      const initialUserPickleTokenBalance = Number(ethers.utils.formatEther(await erc20Farm.balanceOf(addr1.address)));
      log("User's Pickle Token balance, BEFORE withdrawal is: ", initialUserPickleTokenBalance);

      // Check the user's Plexus Coin Reward Token balance in the token contract before withdrawal
      const initialUserPlexusTokenBalance = Number(ethers.utils.formatEther(await erc20PlexusCoin.balanceOf(addr1.address)));
      log("User's Plexus Token balance, BEFORE Pickle Token withdrawal is: ", initialUserPlexusTokenBalance);

      // We withdraw Pickle Tokens from the core contract as addr1/user
      const { status } = await (await coreAsSigner1.withdraw(tier2ContractName, pickleTokenAddress, pickleTokenWithdrawAmount)).wait();

      // Check if the withdraw txn is successful
      expect(status).to.equal(1);

      // Check if txn is successful
      if (status) {

        // Check the user Pickle token balance in the contract account after withdrawal
        const currUserPickleTokenBalance = Number(ethers.utils.formatEther(await erc20Farm.balanceOf(addr1.address)));
        log("User Pickle Token balance, AFTER withdrawal is: ", currUserPickleTokenBalance);

        // Check that the initial user Pickle Token balance is less than the current token balance
        expect(currUserPickleTokenBalance).to.be.gte(initialUserPickleTokenBalance);

        // Check the user Plexus Reward Token balance in the contract account after withdrawal
        const currUserPlexusTokenBalance = Number(ethers.utils.formatEther(await erc20PlexusCoin.balanceOf(addr1.address)));
        log("User Plexus Reward Token balance, AFTER Pickle Token withdrawal is: ", currUserPlexusTokenBalance);

        // Check that the initial user Plexus Token balance is less than the current token balance
        expect(currUserPlexusTokenBalance).to.be.gte(initialUserPlexusTokenBalance);

      }

    });

  });


});