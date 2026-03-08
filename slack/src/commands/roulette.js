const api = require("../api");
const b = require("../blocks");

// Usage:
//   /roulette <red|black|odd|even|low|high> <amount>
//   /roulette number <amount> <0-36>

const COLOR_EMOJI = { red: "🔴", black: "⚫", green: "🟢" };
const EVEN_BETS = ["red", "black", "odd", "even", "low", "high"];
const USAGE = "Usage: `/roulette <red|black|odd|even|low|high|number> <amount> [0-36]`\nExamples: `/roulette red 1.00`  ·  `/roulette number 0.50 7`";

module.exports = async function roulette(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);
  const betType = args[0]?.toLowerCase();
  const amount = args[1];

  if (!betType || (betType !== "number" && !EVEN_BETS.includes(betType)) || !amount) {
    return res.json(b.error(USAGE));
  }

  const betValue = betType === "number" ? args[2] : null;
  if (betType === "number" && !betValue) {
    return res.json(b.error("Number bet requires a value (0–36)  —  e.g. `/roulette number 0.50 7`"));
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.roulette(user_id, betType, amount, betValue);

    const emoji = COLOR_EMOJI[result.spin_color] || "";
    const betLabel = betType === "number" ? `#${betValue}` : betType.charAt(0).toUpperCase() + betType.slice(1);
    const won = result.won;
    const outcomeText = won
      ? `🎉  *${user_name} wins $${parseFloat(result.payout).toFixed(2)} USDC!*`
      : `💸  *${user_name} loses $${parseFloat(result.amount).toFixed(2)} USDC.*`;
    const fallback = `${user_name} bet ${betLabel} — wheel landed ${result.spin} (${result.spin_color}). ${won ? "Win!" : "Loss."}`;

    res.json(b.inChannel([
      b.header("🎰", "Roulette"),
      b.divider(),
      b.text(`<@${user_id}> bet *${betLabel}* for $${parseFloat(result.amount).toFixed(2)} USDC`),
      b.text(`The wheel lands on ${emoji} *${result.spin}* (${result.spin_color})`),
      b.divider(),
      b.text(outcomeText),
    ], fallback));
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    res.json(b.error(msg));
  }
};
