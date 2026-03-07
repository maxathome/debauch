const api = require("../api");

module.exports = async function balance(req, res) {
  const { user_id, user_name } = req.body;

  try {
    await api.getOrCreateUser(user_id, user_name);
    const wallet = await api.getWallet(user_id);
    res.json({ response_type: "ephemeral", text: `Your balance: *$${parseFloat(wallet.balance_usdc).toFixed(2)} USDC*` });
  } catch (err) {
    res.json({ response_type: "ephemeral", text: "Error fetching balance. Try again." });
  }
};
