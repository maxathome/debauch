const api = require("../api");

// Usage:
//   /roulette <red|black|odd|even|low|high> <amount>
//   /roulette number <amount> <0-36>
// Examples:
//   /roulette red 1.00
//   /roulette number 0.50 7

const COLOR_EMOJI = { red: ":red_circle:", black: ":black_circle:", green: ":large_green_circle:" };
const EVEN_BETS = ["red", "black", "odd", "even", "low", "high"];

const USAGE = "Usage: `/roulette <red|black|odd|even|low|high|number> <amount> [0-36]`\nExamples:\n• `/roulette red 1.00`\n• `/roulette number 0.50 7`";

module.exports = async function roulette(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);
  const betType = args[0]?.toLowerCase();
  const amount = args[1];

  if (!betType || (betType !== "number" && !EVEN_BETS.includes(betType))) {
    return res.json({ response_type: "ephemeral", text: USAGE });
  }
  if (!amount) {
    return res.json({ response_type: "ephemeral", text: USAGE });
  }

  const betValue = betType === "number" ? args[2] : null;
  if (betType === "number" && !betValue) {
    return res.json({ response_type: "ephemeral", text: "Number bet requires a value (0–36).\nExample: `/roulette number 0.50 7`" });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.roulette(user_id, betType, amount, betValue);

    const emoji = COLOR_EMOJI[result.spin_color] || "";
    const betLabel = betType === "number" ? `#${betValue}` : betType.charAt(0).toUpperCase() + betType.slice(1);
    const outcome = result.won
      ? `*${user_name} wins $${parseFloat(result.payout).toFixed(2)} USDC!*`
      : `*${user_name} loses $${parseFloat(result.amount).toFixed(2)} USDC.*`;

    res.json({
      response_type: "in_channel",
      text: `${user_name} bet *${betLabel}* for $${parseFloat(result.amount).toFixed(2)}\n\nThe wheel lands on ${emoji} *${result.spin}* (${result.spin_color})\n\n${outcome}`,
    });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    res.json({ response_type: "ephemeral", text: `Error: ${msg}` });
  }
};
