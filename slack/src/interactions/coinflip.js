const axios = require("axios");
const api = require("../api");
const b = require("../blocks");

const GIFS = {
  heads: "https://media.giphy.com/media/52yUUKcrp5tnO4aZj4/giphy.gif",
  tails: "https://media.giphy.com/media/fKk828EOeTNIWoY3bm/giphy.gif",
};

// User clicked Heads or Tails — read amount from state, process the flip
async function onFlip(payload, action) {
  const choice = action.value; // "heads" or "tails"
  const { id: user_id, name: user_name } = payload.user;

  // Read selected amount from the dropdown state
  const stateValues = Object.values(payload.state?.values || {});
  const amountState = stateValues.flatMap(Object.values).find(v => v.type === "static_select");
  const amount = amountState?.selected_option?.value;

  if (!amount) {
    await axios.post(payload.response_url, {
      replace_original: true,
      text: ":warning: Please select a bet amount first.",
    });
    return;
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const result = await api.coinflip(user_id, choice, amount);

    const coin = result.result === "heads" ? "🟡 HEADS" : "⚫ TAILS";
    const outcomeText = result.won
      ? `🎉  *${user_name} wins $${parseFloat(result.payout).toFixed(2)} USDC!*`
      : `💸  *${user_name} loses $${parseFloat(result.amount).toFixed(2)} USDC.*`;
    const fallback = `${user_name} flipped ${choice} — landed ${result.result}. ${result.won ? "Win!" : "Loss."}`;

    await axios.post(payload.response_url, { delete_original: true });

    await axios.post("https://slack.com/api/chat.postMessage", {
      channel: payload.channel.id,
      text: fallback,
      blocks: [
        b.textWithThumbnail(
          `🪙 *Coin Flip*\n\n<@${user_id}> picked *${choice.toUpperCase()}* — lands *${coin}*\n\n${outcomeText}`,
          GIFS[result.result],
          `${result.result} coin`
        ),
      ],
    }, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });
  } catch (err) {
    console.error("[coinflip] error:", err.message, err.response?.data);
    const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
    await axios.post(payload.response_url, {
      replace_original: true,
      text: `:warning: ${msg}`,
    });
  }
}

module.exports = { onFlip };
