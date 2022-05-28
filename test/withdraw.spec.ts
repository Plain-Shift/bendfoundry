import { TestEnv, makeSuite } from "./helpers/make-suite";
import { deployInterestRate } from "../helpers/contracts-deployments";
import { rateStrategyStableOne } from "../markets/bend/rateStrategies";

import {
  mintERC20,
  mintERC721,
  approveERC20,
  approveERC721,
  setApprovalForAll,
  deposit,
  borrow,
  withdraw,
  repay,
} from "./helpers/actions";
import { configuration as actionsConfiguration } from "./helpers/actions";
import { configuration as calculationsConfiguration } from "./helpers/utils/calculations";
import BigNumber from "bignumber.js";
import { getReservesConfigByPool } from "../helpers/configuration";
import { BendPools, iBendPoolAssets, IReserveParams } from "../helpers/types";
import { waitForTx } from "../helpers/misc-utils";
import { strategyDAI } from "../markets/bend/reservesConfigs";

const { expect } = require("chai");

makeSuite("LendPool: Withdraw", (testEnv: TestEnv) => {
  let rateInstance: InterestRate;
  let dai: MintableERC20;
  let bDai: BToken;

  before("Initializing configuration", async () => {
    // Sets BigNumber for this suite, instead of globally
    BigNumber.config({
      DECIMAL_PLACES: 0,
      ROUNDING_MODE: BigNumber.ROUND_DOWN,
    });

    actionsConfiguration.skipIntegrityCheck = false; //set this to true to execute solidity-coverage

    calculationsConfiguration.reservesParams = <iBendPoolAssets<IReserveParams>>(
      getReservesConfigByPool(BendPools.proto)
    );

    const { addressesProvider } = testEnv;

    rateInstance = await deployInterestRate(
      [
        addressesProvider.address,
        rateStrategyStableOne.optimalUtilizationRate,
        rateStrategyStableOne.baseVariableBorrowRate,
        rateStrategyStableOne.variableRateSlope1,
        rateStrategyStableOne.variableRateSlope2,
      ],
      false
    );

    dai = testEnv.dai;
    bDai = testEnv.bDai;
  });

  after("Reset", () => {
    // Reset BigNumber
    BigNumber.config({
      DECIMAL_PLACES: 20,
      ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    });
  });

  it("Simulate GH issue #21 - manipulatible interest rate", async () => {
    const { users } = testEnv;
    const user0 = users[0];
    const user1 = users[1];

    await mintERC20(testEnv, user1, "DAI", "1000");
    await approveERC20(testEnv, user1, "DAI");

    await deposit(testEnv, user0, "", "DAI", "1000", user0.address, "success", "");
    await deposit(testEnv, user1, "", "DAI", "1000", user1.address, "success", "");

    // here let's call InterestRate#calculateInterestRates
    const { 0: currentLiquidityRate, 1: currentVariableBorrowRate } = await rateInstance[
      "calculateInterestRates(address,address,uint256,uint256,uint256,uint256)"
    ](dai.address, bDai.address, 0, 0, 0, strategyDAI.reserveFactor);

    console.log("before withdraw: currentLiquidityRate", currentLiquidityRate.toString());
    console.log("before withdraw: currentVariableBorrowRate", currentVariableBorrowRate.toString());

    await withdraw(testEnv, user0, "DAI", "-1", "success", "");

    await withdraw(testEnv, user1, "DAI", "-1", "success", "");

    console.log("after withdraw: currentLiquidityRate", currentLiquidityRate.toString());
    console.log("after withdraw: currentVariableBorrowRate", currentVariableBorrowRate.toString());
  });

  // it("User 0 Deposits 1000 DAI in an empty reserve", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];

  //   await mintERC20(testEnv, user0, "DAI", "1000");

  //   await approveERC20(testEnv, user0, "DAI");

  //   await deposit(testEnv, user0, "", "DAI", "1000", user0.address, "success", "");
  // });

  // it("User 0 withdraws half of the deposited DAI", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];

  //   await waitForTx(await testEnv.mockIncentivesController.resetHandleActionIsCalled());

  //   await withdraw(testEnv, user0, "DAI", "500", "success", "");

  //   const checkResult = await testEnv.mockIncentivesController.checkHandleActionIsCalled();
  //   await waitForTx(await testEnv.mockIncentivesController.resetHandleActionIsCalled());
  //   expect(checkResult).to.be.equal(true, "IncentivesController not called");
  // });

  // it("User 0 withdraws remaining half of the deposited DAI", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];

  //   await withdraw(testEnv, user0, "DAI", "-1", "success", "");
  // });

  // it("User 0 Deposits 1 WETH in an empty reserve", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];

  //   await mintERC20(testEnv, user0, "WETH", "1");

  //   await approveERC20(testEnv, user0, "WETH");

  //   await deposit(testEnv, user0, "", "WETH", "1", user0.address, "success", "");
  // });

  // it("User 0 withdraws half of the deposited WETH", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];

  //   await withdraw(testEnv, user0, "WETH", "0.5", "success", "");
  // });

  // it("User 0 withdraws remaining half of the deposited WETH", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];

  //   await withdraw(testEnv, user0, "WETH", "-1", "success", "");
  // });

  // it("Users 0 and 1 Deposit 1000 DAI, both withdraw", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];
  //   const user1 = users[1];

  //   await mintERC20(testEnv, user1, "DAI", "1000");

  //   await approveERC20(testEnv, user1, "DAI");

  //   await deposit(testEnv, user0, "", "DAI", "1000", user0.address, "success", "");

  //   await deposit(testEnv, user1, "", "DAI", "1000", user1.address, "success", "");

  //   await withdraw(testEnv, user0, "DAI", "-1", "success", "");

  //   await withdraw(testEnv, user1, "DAI", "-1", "success", "");
  // });

  // it("Users 0 deposits 1000 DAI, user 1 Deposit 1000 USDC and 1 WETH, borrows 100 DAI. User 1 tries to withdraw all the USDC", async () => {
  //   const { users } = testEnv;
  //   const user0 = users[0];
  //   const user1 = users[1];

  //   // Users 0 deposits 1000 DAI
  //   await deposit(testEnv, user0, "", "DAI", "1000", user0.address, "success", "");

  //   // user 1 Deposit 1000 USDC
  //   await mintERC20(testEnv, user1, "USDC", "1000");

  //   await approveERC20(testEnv, user1, "USDC");

  //   await deposit(testEnv, user1, "", "USDC", "1000", user1.address, "success", "");

  //   // user 1 Deposit 1 WETH
  //   await mintERC20(testEnv, user1, "WETH", "1");

  //   await approveERC20(testEnv, user1, "WETH");

  //   await deposit(testEnv, user1, "", "WETH", "1", user1.address, "success", "");

  //   // user 1 borrows 100 DAI
  //   await mintERC721(testEnv, user1, "BAYC", "101");

  //   await setApprovalForAll(testEnv, user1, "BAYC");

  //   await borrow(testEnv, user1, "WETH", "0.01", "BAYC", "101", user1.address, "", "success", "");

  //   // User 1 tries to withdraw all the USDC
  //   await withdraw(testEnv, user1, "USDC", "-1", "success", "");
  // });
});
