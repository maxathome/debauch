require("dotenv").config();
const { ethers } = require("ethers");

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const usdc = new ethers.Contract(process.env.USDC_CONTRACT_ADDRESS, ERC20_ABI, provider);

  const address = process.env.BOT_WALLET_ADDRESS;
  const [rawBalance, decimals, ethBalance] = await Promise.all([
    usdc.balanceOf(address),
    usdc.decimals(),
    provider.getBalance(address),
  ]);

  console.log(`Wallet: ${address}`);
  console.log(`ETH:    ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`USDC:   ${ethers.formatUnits(rawBalance, decimals)} USDC`);
}

main().catch(console.error);
