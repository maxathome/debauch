const api = require("../api");
const b = require("../blocks");

// Usage: /coinflip <heads|tails> <amount>

module.exports = async function coinflip(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);
  const choice = args[0]?.toLowerCase();
  const amount = args[1];

  if (!["heads", "tails"].includes(choice) || !amount) {
    return res.json(b.error("Usage: `/coinflip <heads|tails> <amount>`  —  e.g. `/coinflip heads 0.50`"));
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.coinflip(user_id, choice, amount);

    const coin = result.result === "heads" ? "🟡 HEADS" : "⚫ TAILS";
    const won = result.won;
    const outcomeText = won
      ? `🎉  *${user_name} wins $${parseFloat(result.payout).toFixed(2)} USDC!*`
      : `💸  *${user_name} loses $${parseFloat(result.amount).toFixed(2)} USDC.*`;
    const fallback = `${user_name} flipped ${choice} — landed ${result.result}. ${won ? "Win!" : "Loss."}`;

    res.json(b.inChannel([
      b.header("🪙", "Coin Flip"),
      b.divider(),
      b.text(`<@${user_id}> picked *${choice.toUpperCase()}* — the coin lands *${coin}*`),
      b.text(outcomeText),
    ], fallback));
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    res.json(b.error(msg));
  }
};
