const hre = require("hardhat");

// USDC contract addresses
const USDC = {
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "base-mainnet": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

async function main() {
  const network = hre.network.name;
  const usdcAddress = USDC[network];

  if (!usdcAddress) {
    throw new Error(`No USDC address configured for network: ${network}`);
  }

  console.log(`Deploying BetEscrow to ${network}...`);
  console.log(`USDC address: ${usdcAddress}`);

  const BetEscrow = await hre.ethers.getContractFactory("BetEscrow");
  const betEscrow = await BetEscrow.deploy(usdcAddress);
  await betEscrow.waitForDeployment();

  const address = await betEscrow.getAddress();
  console.log(`\nBetEscrow deployed to: ${address}`);
  console.log(`\nAdd this to your .env files:`);
  console.log(`BET_ESCROW_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
