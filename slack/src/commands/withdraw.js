const api = require("../api");

// Usage: /withdraw <amount> <address>
// Example: /withdraw 5.00 0xABC...

module.exports = async function withdraw(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);
  const amount = parseFloat(args[0]);
  const address = args[1];

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.json({ response_type: "ephemeral", text: "Usage: `/withdraw <amount> <address>`\nExample: `/withdraw 5.00 0xABC...`" });
  }
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.json({ response_type: "ephemeral", text: "Invalid wallet address. Must be a valid 0x address." });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.withdraw(user_id, amount, address);
    res.json({
      response_type: "ephemeral",
      text: `*Withdrawal submitted!*\nAmount: $${parseFloat(result.amount_usdc).toFixed(2)} USDC\nTo: \`${result.to_address}\`\nStatus: ${result.status}\n\n_Transaction will be sent within a few minutes._`,
    });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong.";
    res.json({ response_type: "ephemeral", text: `Error: ${msg}` });
  }
};
