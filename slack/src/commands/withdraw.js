const api = require("../api");
const b = require("../blocks");

// Usage: /withdraw <amount> <address>

module.exports = async function withdraw(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);
  const amount = args[0];
  const address = args[1];

  if (!amount || !address) {
    return res.json(b.error("Usage: `/withdraw <amount> <address>`  —  e.g. `/withdraw 5.00 0xABC...`"));
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.withdraw(user_id, amount, address);

    res.json(b.ephemeral([
      b.header("📤", "Withdrawal Submitted"),
      b.divider(),
      b.fields(
        ["Amount", `$${parseFloat(result.amount_usdc).toFixed(2)} USDC`],
        ["To", `\`${result.to_address}\``],
      ),
      b.context("Transaction will be sent within a few minutes."),
    ], `Withdrawal of $${parseFloat(result.amount_usdc).toFixed(2)} USDC submitted.`));
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong.";
    res.json(b.error(msg));
  }
};
