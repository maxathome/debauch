const api = require("../api");
const b = require("../blocks");

// Usage: /donate <amount>

module.exports = async function donate(req, res) {
  const { user_id, user_name, text } = req.body;
  const amount = (text || "").trim();

  if (!amount) {
    return res.json(b.error("Usage: `/donate <amount>`  —  e.g. `/donate 5.00`"));
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    await api.donateToHouse(user_id, amount);
    const formatted = `$${parseFloat(amount).toFixed(2)} USDC`;

    res.json(b.inChannel([
      b.header("🎁", `${user_name} donated ${formatted} to the house!`),
      b.text("The games live on! 🎰"),
    ], `${user_name} donated ${formatted} to the house!`));
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    res.json(b.error(msg));
  }
};
