const axios = require("axios");

const client = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

module.exports = {
  async getOrCreateUser(platformUserId, username) {
    const res = await client.post("/users", { platform_user_id: platformUserId, username });
    return res.data;
  },

  async registerWallet(platformUserId, ethAddress) {
    const res = await client.post(`/users/${platformUserId}/register_wallet`, { eth_address: ethAddress });
    return res.data;
  },

  async getUserByWallet(ethAddress) {
    const res = await client.get(`/users/by_wallet/${ethAddress}`);
    return res.data;
  },

  async createUnknownDeposit(senderAddress, amountUsdc, txHash, blockNumber) {
    const res = await client.post("/admin/unknown_deposits", {
      sender_address: senderAddress,
      amount_usdc: amountUsdc,
      tx_hash: txHash,
      block_number: blockNumber,
    });
    return res.data;
  },

  async getWallet(platformUserId) {
    const res = await client.get(`/users/${platformUserId}/wallet`);
    return res.data;
  },

  async deposit(platformUserId, amount, txHash) {
    const res = await client.post(`/users/${platformUserId}/wallet/deposit`, { amount, tx_hash: txHash });
    return res.data;
  },

  async withdraw(platformUserId, amount, toAddress, txHash) {
    const res = await client.post(`/users/${platformUserId}/wallet/withdraw`, { amount, to_address: toAddress, tx_hash: txHash });
    return res.data;
  },

  async donateToHouse(platformUserId, amount) {
    const res = await client.post(`/users/${platformUserId}/wallet/donate`, { amount });
    return res.data;
  },

  async getHouseBalance() {
    const res = await client.get("/house");
    return res.data;
  },

  async getBets(filter, userId) {
    const res = await client.get("/bets", { params: { filter, user_id: userId } });
    return res.data;
  },

  async createBet(params) {
    const res = await client.post("/bets", params);
    return res.data;
  },

  async getBet(betId) {
    const res = await client.get(`/bets/${betId}`);
    return res.data;
  },

  async updateBetContractId(betId, contractBetId) {
    const res = await client.patch(`/bets/${betId}/set_contract_id`, { contract_bet_id: contractBetId });
    return res.data;
  },

  async acceptBet(betId) {
    const res = await client.patch(`/bets/${betId}/accept`);
    return res.data;
  },

  async declineBet(betId) {
    const res = await client.patch(`/bets/${betId}/decline`);
    return res.data;
  },

  async resolveBet(betId, winnerId) {
    const res = await client.patch(`/bets/${betId}/resolve`, { winner_id: winnerId });
    return res.data;
  },

  async cancelBet(betId) {
    const res = await client.patch(`/bets/${betId}/cancel`);
    return res.data;
  },

  async getExpiredPendingBets() {
    const res = await client.get("/bets/expired_pending");
    return res.data;
  },

  async expireBet(betId) {
    const res = await client.patch(`/bets/${betId}/expire`);
    return res.data;
  },

  async coinflip(platformUserId, choice, amount) {
    const res = await client.post("/games/coinflip", { platform_user_id: platformUserId, choice, amount });
    return res.data;
  },

  async roulette(platformUserId, betType, amount, betValue = null) {
    const res = await client.post("/games/roulette", {
      platform_user_id: platformUserId,
      bet_type: betType,
      amount,
      bet_value: betValue,
    });
    return res.data;
  },
};
