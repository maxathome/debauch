const { ethers } = require("ethers");

const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];

async function sendUsdc(toAddress, amountUsdc) {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const wallet   = new ethers.Wallet(process.env.BOT_WALLET_PRIVATE_KEY, provider);
  const usdc     = new ethers.Contract(process.env.USDC_CONTRACT_ADDRESS, USDC_ABI, wallet);

  const amount = ethers.parseUnits(amountUsdc.toString(), 6);
  const tx = await usdc.transfer(toAddress, amount);
  const receipt = await tx.wait();
  console.log(`[usdc-transfer] Sent ${amountUsdc} USDC to ${toAddress} (tx: ${receipt.hash})`);
  return receipt.hash;
}

module.exports = { sendUsdc };
