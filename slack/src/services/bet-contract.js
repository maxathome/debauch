const { ethers } = require("ethers");

// Human-readable ABI — matches BetEscrow.sol
const BET_ESCROW_ABI = [
  "function createBet(uint256 resolveAfter, uint256 p1Amount) external returns (uint256)",
  "function activateBet(uint256 betId, uint256 p2Amount) external",
  "function resolveBet(uint256 betId) external",
  "function cancelBet(uint256 betId) external",
  "function expireBet(uint256 betId) external",
  "function bets(uint256) external view returns (uint256 p1Stake, uint256 p2Stake, uint256 resolveAfter, uint256 createdAt, uint8 status)",
  "event BetCreated(uint256 indexed betId, uint256 resolveAfter, uint256 p1Stake)",
  "event BetActivated(uint256 indexed betId, uint256 totalStake)",
  "event BetResolved(uint256 indexed betId, uint256 totalPot)",
  "event BetCancelled(uint256 indexed betId, uint256 refunded)",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

function getSigner() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  return new ethers.Wallet(process.env.BOT_WALLET_PRIVATE_KEY, provider);
}

function getContracts(signer) {
  const betEscrow = new ethers.Contract(process.env.BET_ESCROW_ADDRESS, BET_ESCROW_ABI, signer);
  const usdc = new ethers.Contract(process.env.USDC_CONTRACT_ADDRESS, USDC_ABI, signer);
  return { betEscrow, usdc };
}

// Approve max USDC once, skip if already approved
async function ensureApproval(usdc, spender) {
  const signerAddr = await usdc.runner.getAddress();
  const allowance = await usdc.allowance(signerAddr, spender);
  if (allowance < ethers.parseUnits("1000000", 6)) {
    console.log("[bet-contract] Approving USDC for BetEscrow...");
    const tx = await usdc.approve(spender, ethers.MaxUint256);
    await tx.wait();
    console.log("[bet-contract] USDC approved");
  }
}

// Step 1: Create bet on-chain with p1's stake. Returns the contract betId.
async function createBet(resolveAfterUnix, amountUsdc) {
  const signer = getSigner();
  const { betEscrow, usdc } = getContracts(signer);
  const amount = ethers.parseUnits(amountUsdc.toString(), 6);

  await ensureApproval(usdc, await betEscrow.getAddress());

  const tx = await betEscrow.createBet(resolveAfterUnix, amount);
  const receipt = await tx.wait();

  const log = receipt.logs.find((l) => {
    try { return betEscrow.interface.parseLog(l).name === "BetCreated"; } catch { return false; }
  });
  const contractBetId = Number(betEscrow.interface.parseLog(log).args.betId);
  console.log(`[bet-contract] Created bet #${contractBetId} on-chain (tx: ${receipt.hash})`);
  return contractBetId;
}

// Step 2: Activate bet on-chain with p2's stake.
async function activateBet(contractBetId, amountUsdc) {
  const signer = getSigner();
  const { betEscrow, usdc } = getContracts(signer);
  const amount = ethers.parseUnits(amountUsdc.toString(), 6);

  await ensureApproval(usdc, await betEscrow.getAddress());

  const tx = await betEscrow.activateBet(contractBetId, amount);
  const receipt = await tx.wait();
  console.log(`[bet-contract] Activated bet #${contractBetId} on-chain (tx: ${receipt.hash})`);
}

// Resolve: releases full pot back to bot wallet.
async function resolveBet(contractBetId) {
  const signer = getSigner();
  const { betEscrow } = getContracts(signer);
  const tx = await betEscrow.resolveBet(contractBetId);
  const receipt = await tx.wait();
  console.log(`[bet-contract] Resolved bet #${contractBetId} on-chain (tx: ${receipt.hash})`);
}

// Cancel: refunds all stakes back to bot wallet.
async function cancelBet(contractBetId) {
  const signer = getSigner();
  const { betEscrow } = getContracts(signer);
  const tx = await betEscrow.cancelBet(contractBetId);
  const receipt = await tx.wait();
  console.log(`[bet-contract] Cancelled bet #${contractBetId} on-chain (tx: ${receipt.hash})`);
}

// Expire: refunds p1 stake after 12h acceptance window.
async function expireBet(contractBetId) {
  const signer = getSigner();
  const { betEscrow } = getContracts(signer);
  const tx = await betEscrow.expireBet(contractBetId);
  const receipt = await tx.wait();
  console.log(`[bet-contract] Expired bet #${contractBetId} on-chain (tx: ${receipt.hash})`);
}

module.exports = { createBet, activateBet, resolveBet, cancelBet, expireBet };
