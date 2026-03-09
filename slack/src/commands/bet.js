const axios = require("axios");
const b = require("../blocks");
const api = require("../api");

const SLACK_TOKEN = () => process.env.SLACK_BOT_TOKEN;

module.exports = async function bet(req, res) {
  const { user_id, user_name, trigger_id, channel_id } = req.body;

  // Ensure user exists
  await api.getOrCreateUser(user_id, user_name).catch(() => {});

  const modal = b.modal(
    "bet_create",
    "New Bet",
    "Place Bet",
    [
      b.textarea("bet_description", "What's the bet?", "description", "e.g. Free throw attempt tomorrow at 9pm"),
      b.input("bet_p1_wins_if", "I win if...", "player1_wins_if", "e.g. I make the shot"),
      b.input("bet_p2_wins_if", "They win if...", "player2_wins_if", "e.g. I miss the shot"),
      b.input("bet_amount", "Amount (USDC each)", "amount", "e.g. 5"),
      b.userSelect("bet_opponent", "Bet against", "opponent", "Select a player..."),
      b.userSelect("bet_arbitrator", "Arbitrator", "arbitrator", "Who decides who won?"),
      b.datetimePicker("bet_resolve_after", "Can be resolved after", "resolve_after"),
    ],
    // Pass channel_id and initiator through the modal so we have it on submit
    JSON.stringify({ channel_id, player1_id: user_id, player1_username: user_name })
  );

  await axios.post(
    "https://slack.com/api/views.open",
    { trigger_id, view: modal },
    { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } }
  );

  res.send("");
};
