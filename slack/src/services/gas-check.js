const { ethers } = require("ethers");

const LOW_GAS_THRESHOLD = ethers.parseEther("0.001");

async function getEthBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  return provider.getBalance(process.env.BOT_WALLET_ADDRESS);
}

async function gasWarning() {
  try {
    const balance = await getEthBalance();
    const eth = parseFloat(ethers.formatEther(balance));
    if (balance < LOW_GAS_THRESHOLD) {
      return `⚠️ *Low gas warning:* Bot wallet has ${eth.toFixed(6)} ETH — top up to keep transactions running.`;
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { gasWarning };
