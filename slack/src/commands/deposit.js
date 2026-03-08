const axios = require("axios");
const api = require("../api");
const b = require("../blocks");

module.exports = async function deposit(req, res) {
  const { user_id, user_name, trigger_id } = req.body;
  const botAddress = process.env.BOT_WALLET_ADDRESS;

  try {
    await api.getOrCreateUser(user_id, user_name);
    const wallet = await api.getWallet(user_id);
    const balance = `$${parseFloat(wallet.balance_usdc).toFixed(2)} USDC`;
    const registered = wallet.eth_address
      ? `✅ Registered: \`${wallet.eth_address}\``
      : "⚠️ No wallet registered yet.";

    await axios.post("https://slack.com/api/views.open", {
      trigger_id,
      view: b.modal("deposit_register", "Deposit USDC", "Register Wallet", [
        b.text(`📥 *Send USDC on Base to:*\n\`${botAddress}\`\n\nBalance auto-credited within 30 seconds.`),
        b.context(`*Current balance:* ${balance}    ${registered}`),
        b.input("wallet_block", "Your sending wallet address", "wallet_input", "0x..."),
      ]),
    }, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });

    res.send("");
  } catch (err) {
    console.error("[deposit] error:", err.response?.data || err.message);
    res.json(b.error("Something went wrong opening the deposit form."));
  }
};
