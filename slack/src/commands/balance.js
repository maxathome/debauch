const api = require("../api");
const b = require("../blocks");

module.exports = async function balance(req, res) {
  const { user_id, user_name } = req.body;

  try {
    await api.getOrCreateUser(user_id, user_name);
    const wallet = await api.getWallet(user_id);
    const amount = `$${parseFloat(wallet.balance_usdc).toFixed(2)} USDC`;

    res.json(b.ephemeral([
      b.header("💰", "Your Balance"),
      b.divider(),
      b.text(`*${amount}*`),
    ], amount));
  } catch (err) {
    res.json(b.error("Error fetching balance. Try again."));
  }
};
