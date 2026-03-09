const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const api = require("../api");

const LAST_BLOCK_FILE = path.join(__dirname, "../../data/last-block.json");
const POLL_INTERVAL_MS = 30_000;
const MAX_BLOCK_RANGE = 2_000;
// Base produces ~1 block every 2s. 50,000 blocks ≈ 27 hours.
// Increase this if you need a longer automatic backfill window.
const MAX_BACKFILL_BLOCKS = 50_000;

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

  // Scan in chunks to stay within the RPC provider's block range limit
  const toBlock = Math.min(currentBlock, fromBlock + MAX_BLOCK_RANGE);

  console.log(`[poller] Scanning blocks ${fromBlock} → ${toBlock}`);

  const filter = usdc.filters.Transfer(null, process.env.BOT_WALLET_ADDRESS);
  const events = await usdc.queryFilter(filter, fromBlock, toBlock);

  for (const event of events) {
    const sender = event.args.from.toLowerCase();
    const amount = parseFloat(ethers.formatUnits(event.args.value, decimals));
    const txHash = event.transactionHash;
    const blockNumber = event.blockNumber;

    console.log(`[poller] Incoming deposit: ${amount} USDC from ${sender} (tx: ${txHash})`);

    try {
      const user = await api.getUserByWallet(sender);
      // Known user — credit their balance
      await api.deposit(user.platform_user_id, amount.toString(), txHash);
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

  saveLastBlock(toBlock);
}

async function backfill(provider, usdc, decimals) {
  const currentBlock = await provider.getBlockNumber();
  const savedBlock = loadLastBlock() ?? currentBlock - 100;

  if (savedBlock >= currentBlock) {
    console.log("[poller] Backfill: already up to date");
    return;
  }

  const gap = currentBlock - savedBlock;
  let fromBlock = savedBlock;

  if (gap > MAX_BACKFILL_BLOCKS) {
    fromBlock = currentBlock - MAX_BACKFILL_BLOCKS;
    console.warn(
      `[poller] Backfill: gap of ${gap} blocks exceeds MAX_BACKFILL_BLOCKS (${MAX_BACKFILL_BLOCKS}). ` +
      `Starting from block ${fromBlock} — deposits before this block must be credited manually.`
    );
  }

  const totalBlocks = currentBlock - fromBlock;
  const chunks = Math.ceil(totalBlocks / MAX_BLOCK_RANGE);
  console.log(`[poller] Backfill: scanning ${totalBlocks} missed blocks in ${chunks} chunk(s)...`);

  let cursor = fromBlock;
  while (cursor < currentBlock) {
    const toBlock = Math.min(currentBlock, cursor + MAX_BLOCK_RANGE);
    console.log(`[poller] Backfill: chunk ${cursor} → ${toBlock}`);

    const filter = usdc.filters.Transfer(null, process.env.BOT_WALLET_ADDRESS);
    const events = await usdc.queryFilter(filter, cursor, toBlock);

    for (const event of events) {
      const sender = event.args.from.toLowerCase();
      const amount = parseFloat(ethers.formatUnits(event.args.value, decimals));
      const txHash = event.transactionHash;
      const blockNumber = event.blockNumber;

      console.log(`[poller] Backfill deposit: ${amount} USDC from ${sender} (tx: ${txHash})`);

      try {
        const user = await api.getUserByWallet(sender);
        await api.deposit(user.platform_user_id, amount.toString(), txHash);
        console.log(`[poller] Backfill credited $${amount} to ${user.username}`);
      } catch (err) {
        if (err.response?.status === 404) {
          await api.createUnknownDeposit(sender, amount.toString(), txHash, blockNumber);
          console.log(`[poller] Backfill unknown deposit logged from ${sender}`);
        } else if (err.response?.status === 422 && err.response?.data?.error?.includes("already")) {
          // Already credited — skip silently
        } else {
          console.error(`[poller] Backfill error for ${txHash}:`, err.message);
        }
      }
    }

    cursor = toBlock;
    saveLastBlock(cursor);
  }

  console.log("[poller] Backfill complete");
}

// Check for pending bets past the 12-hour acceptance window and expire them.
// Runs every 5 minutes.
const BET_EXPIRE_INTERVAL_MS = 5 * 60_000;

async function expireStaleContracts() {
  if (!process.env.BET_ESCROW_ADDRESS) return; // contract not deployed yet

  const { ethers: _ethers } = require("ethers");
  const BET_ESCROW_ABI = [
    "function expireBet(uint256 betId) external",
  ];

  let expiredBets;
  try {
    expiredBets = await api.getExpiredPendingBets();
  } catch (err) {
    console.error("[poller] Failed to fetch expired bets:", err.message);
    return;
  }

  if (!expiredBets.length) return;
  console.log(`[poller] Found ${expiredBets.length} expired pending bet(s)`);

  const provider = new _ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const wallet   = new _ethers.Wallet(process.env.BOT_WALLET_PRIVATE_KEY, provider);
  const contract = new _ethers.Contract(process.env.BET_ESCROW_ADDRESS, BET_ESCROW_ABI, wallet);

  for (const bet of expiredBets) {
    try {
      if (bet.contract_bet_id != null) {
        const tx = await contract.expireBet(bet.contract_bet_id);
        await tx.wait();
        console.log(`[poller] Expired bet #${bet.id} on-chain (contract bet #${bet.contract_bet_id})`);
      }
      await api.expireBet(bet.id);
      console.log(`[poller] Marked bet #${bet.id} as expired in DB`);
    } catch (err) {
      console.error(`[poller] Failed to expire bet #${bet.id}:`, err.message);
    }
  }
}

async function start() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const usdc = new ethers.Contract(process.env.USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
  const decimals = await usdc.decimals();

  console.log(`[poller] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  await backfill(provider, usdc, decimals);
  poll(provider, usdc, decimals);
  setInterval(() => poll(provider, usdc, decimals), POLL_INTERVAL_MS);

  // Expire stale pending bets every 5 minutes
  expireStaleContracts();
  setInterval(expireStaleContracts, BET_EXPIRE_INTERVAL_MS);
}

module.exports = { start };
