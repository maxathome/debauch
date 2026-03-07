const api = require("../api");

// Usage: /coinflip <heads|tails> <amount>
// Example: /coinflip heads 0.50

const MIN_BET = 0.01;
const MAX_BET = 10.00;

module.exports = async function coinflip(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);
  const choice = args[0]?.toLowerCase();
  const amount = parseFloat(args[1]);

  if (!["heads", "tails"].includes(choice)) {
    return res.json({ response_type: "ephemeral", text: "Usage: `/coinflip <heads|tails> <amount>`\nExample: `/coinflip heads 0.50`" });
  }
  if (!amount || isNaN(amount) || amount < MIN_BET || amount > MAX_BET) {
    return res.json({ response_type: "ephemeral", text: `Bet must be between $${MIN_BET} and $${MAX_BET} USDC.` });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.coinflip(user_id, choice, amount);

    const coin = result.result === "heads" ? "HEADS" : "TAILS";
    const outcome = result.won
      ? `*${user_name} wins $${parseFloat(result.payout).toFixed(2)} USDC!*`
      : `*${user_name} loses $${parseFloat(result.amount).toFixed(2)} USDC.*`;

    res.json({
      response_type: "in_channel",
      text: `${user_name} picked *${choice.toUpperCase()}* — the coin lands *${coin}*\n\n${outcome}`,
    });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    res.json({ response_type: "ephemeral", text: `Error: ${msg}` });
  }
};
