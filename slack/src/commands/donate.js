const api = require("../api");

// Usage: /donate <amount>
// Example: /donate 5.00

module.exports = async function donate(req, res) {
  const { user_id, user_name, text } = req.body;
  const amount = parseFloat((text || "").trim());

  if (!amount || isNaN(amount)) {
    return res.json({ response_type: "ephemeral", text: "Usage: `/donate <amount>`\nExample: `/donate 5.00`" });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    await api.donateToHouse(user_id, amount);
    res.json({ response_type: "in_channel", text: `${user_name} just donated *$${amount.toFixed(2)} USDC* to the house! The games live on!` });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    res.json({ response_type: "ephemeral", text: `Error: ${msg}` });
  }
};
