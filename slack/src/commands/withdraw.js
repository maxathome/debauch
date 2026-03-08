const axios = require("axios");
const api = require("../api");
const b = require("../blocks");

module.exports = async function withdraw(req, res) {
  const { user_id, user_name, trigger_id } = req.body;

  try {
    await api.getOrCreateUser(user_id, user_name);
    const wallet = await api.getWallet(user_id);
    const balance = `$${parseFloat(wallet.balance_usdc).toFixed(2)} USDC`;

    await axios.post("https://slack.com/api/views.open", {
      trigger_id,
      view: b.modal("withdraw_submit", "Withdraw USDC", "Withdraw", [
        b.text(`📤 *Withdraw USDC to your wallet*\n\n*Available balance:* ${balance}`),
        b.input("amount_block", "Amount (USDC)", "amount_input", "e.g. 5.00"),
        b.input("address_block", "Destination wallet address", "address_input", "0x...", wallet.eth_address || null),
      ]),
    }, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });

    res.send("");
  } catch (err) {
    console.error("[withdraw] error:", err.response?.data || err.message);
    res.json(b.error("Something went wrong opening the withdrawal form."));
  }
};
