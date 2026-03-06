const axios = require("axios");

const client = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

module.exports = {
  async getOrCreateUser(discordId, username) {
    const res = await client.post("/users", { discord_id: discordId, username });
    return res.data;
  },

  async getWallet(discordId) {
    const res = await client.get(`/users/${discordId}/wallet`);
    return res.data;
  },

  async deposit(discordId, amount, txHash) {
    const res = await client.post(`/users/${discordId}/wallet/deposit`, { amount, tx_hash: txHash });
    return res.data;
  },

  async withdraw(discordId, amount, toAddress) {
    const res = await client.post(`/users/${discordId}/wallet/withdraw`, { amount, to_address: toAddress });
    return res.data;
  },

  async coinflip(discordId, choice, amount) {
    const res = await client.post("/games/coinflip", { discord_id: discordId, choice, amount });
    return res.data;
  },
};
