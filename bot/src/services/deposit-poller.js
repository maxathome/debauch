const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const api = require("../api");

const LAST_BLOCK_FILE = path.join(__dirname, "../../data/last-block.json");
const POLL_INTERVAL_MS = 30_000;

const USDC_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function decimals() view returns (uint8)",
];

function loadLastBlock() {
  try {
    return JSON.parse(fs.readFileSync(LAST_BLOCK_FILE)).lastBlock;
  } catch {
    return null;
  }
}

function saveLastBlock(blockNumber) {
  fs.writeFileSync(LAST_BLOCK_FILE, JSON.stringify({ lastBlock: blockNumber }));
}

async function poll(provider, usdc, decimals) {
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = loadLastBlock() ?? currentBlock - 100; // start from 100 blocks back on first run

  if (fromBlock >= currentBlock) return;

  console.log(`[poller] Scanning blocks ${fromBlock} → ${currentBlock}`);

  const filter = usdc.filters.Transfer(null, process.env.BOT_WALLET_ADDRESS);
  const events = await usdc.queryFilter(filter, fromBlock, currentBlock);

  for (const event of events) {
    const sender = event.args.from.toLowerCase();
    const amount = parseFloat(ethers.formatUnits(event.args.value, decimals));
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    console.log(`[poller] Incoming deposit: ${amount} USDC from ${sender} (tx: ${txHash})`);

    try {
      const user = await api.getUserByWallet(sender);
      // Known user — credit their balance
      await api.deposit(user.discord_id, amount.toString(), txHash);
      console.log(`[poller] Credited $${amount} to ${user.username}`);
    } catch (err) {
      if (err.response?.status === 404) {
        // Unknown sender — log it
        await api.createUnknownDeposit(sender, amount.toString(), txHash, blockNumber);
        console.log(`[poller] Unknown deposit logged from ${sender}`);
      } else {
        console.error(`[poller] Error processing deposit ${txHash}:`, err.message);
      }
    }
  }

  saveLastBlock(currentBlock);
}

async function start() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const usdc = new ethers.Contract(process.env.USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
  const decimals = await usdc.decimals();

  console.log(`[poller] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  poll(provider, usdc, decimals);
  setInterval(() => poll(provider, usdc, decimals), POLL_INTERVAL_MS);
}

module.exports = { start };
