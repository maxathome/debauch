const axios = require("axios");

const client = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3001/api",
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

  async getWallet(platformUserId) {
    const res = await client.get(`/users/${platformUserId}/wallet`);
    return res.data;
  },

  async deposit(platformUserId, amount, txHash) {
    const res = await client.post(`/users/${platformUserId}/wallet/deposit`, { amount, tx_hash: txHash });
    return res.data;
  },

  async withdraw(platformUserId, amount, toAddress) {
    const res = await client.post(`/users/${platformUserId}/wallet/withdraw`, { amount, to_address: toAddress });
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

  async picknum(player1Id, player2Id, player1Number, player2Number, amount) {
    const res = await client.post("/games/picknum", {
      player1_id: player1Id,
      player2_id: player2Id,
      player1_number: player1Number,
      player2_number: player2Number,
      amount,
    });
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
