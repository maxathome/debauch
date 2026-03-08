const axios = require("axios");
const api = require("../api");
const b = require("../blocks");

const SLACK_TOKEN = () => process.env.SLACK_BOT_TOKEN;

async function getUserInfo(userId) {
  const resp = await axios.get(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${SLACK_TOKEN()}` },
  });
  const profile = resp.data.user?.profile;
  return {
    name: profile?.display_name || profile?.real_name || userId,
    avatar: profile?.image_48,
  };
}

// Player 1 picked a number — store state in Join button, post public game message
async function onP1Pick(payload, action) {
  const { id: p1_id, name: p1_name } = payload.user;
  const number = action.value;

  // Read amount from dropdown state
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

  // Acknowledge to player 1
  await axios.post(payload.response_url, {
    replace_original: true,
    text: `🎯 You picked *${number}* for *$${parseFloat(amount).toFixed(2)} USDC*. Waiting for a challenger...`,
  });

  // Post public challenge message — encode game state in Join button value
  const p1Info = await getUserInfo(p1_id);
  const joinValue = `${amount}:${p1_id}:${number}`;
  await axios.post("https://slack.com/api/chat.postMessage", {
    channel: payload.channel.id,
    text: `${p1_name} started a Pick-a-Number game for $${parseFloat(amount).toFixed(2)} USDC`,
    blocks: [
      b.text(`🎯 *Pick-a-Number* — $${parseFloat(amount).toFixed(2)} USDC`),
      {
        type: "context",
        elements: [
          { type: "image", image_url: p1Info.avatar, alt_text: p1Info.name },
          { type: "mrkdwn", text: `*${p1Info.name}* is in. Who dares challenge?` },
        ],
      },
      b.actions(b.button("⚔️  Join the game", "picknum_join", joinValue, "primary")),
    ],
  }, { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } });
}

// Player 2 clicked Join — validate they're not player 1, open modal
async function onJoin(payload, action) {
  const { id: p2_id } = payload.user;
  const [amount, p1_id, p1_number] = action.value.split(":");
  const message_ts = payload.container?.message_ts;
  const channel_id = payload.channel?.id;

  // if (p2_id === p1_id) {
  //   await axios.post("https://slack.com/api/chat.postEphemeral", {
  //     channel: channel_id,
  //     user: p2_id,
  //     text: ":warning: You can't join your own game.",
  //   }, { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } });
  //   return;
  // }

  // Open modal for player 2 to pick their number
  const meta = `${amount}:${p1_id}:${p1_number}:${channel_id}`;
  const numbers = Array.from({ length: 10 }, (_, i) => [`${i + 1}`, `${i + 1}`]);
  await axios.post("https://slack.com/api/views.open", {
    trigger_id: payload.trigger_id,
    view: b.modal("picknum_p2", "Pick a Number", "Lock it in", [
      b.text(`🎯 Pick a number between *1 and 10*.\nClosest to the target wins the *$${(parseFloat(amount) * 2).toFixed(2)} USDC* pot!`),
      {
        type: "input",
        block_id: "number_block",
        label: { type: "plain_text", text: "Your number", emoji: true },
        element: {
          type: "static_select",
          action_id: "number_input",
          placeholder: { type: "plain_text", text: "Pick...", emoji: true },
          options: numbers.map(([label, value]) => ({
            text: { type: "plain_text", text: label, emoji: true },
            value,
          })),
        },
      },
    ], meta),
  }, { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } });
}

// Player 2 submitted modal — resolve the game
async function onP2Submit(payload, res) {
  const { id: p2_id, name: p2_name } = payload.user;
  const [amount, p1_id, p1_number, channel_id] = payload.view.private_metadata.split(":");
  const p2_number = payload.view.state.values.number_block.number_input.selected_option.value;

  // Acknowledge modal immediately
  res.json({ response_action: "clear" });

  try {
    await api.getOrCreateUser(p2_id, p2_name);
    const result = await api.picknum(p1_id, p2_id, p1_number, p2_number, amount);

    const pot = (parseFloat(amount) * 2).toFixed(2);
    const fmt = d => d === 0 ? "exact!" : d === 1 ? "1 away" : `${d} away`;

    const [p1Info, p2Info] = await Promise.all([getUserInfo(p1_id), getUserInfo(p2_id)]);
    const winnerInfo = result.winner === "player1" ? p1Info : p2Info;

    const winnerId = result.winner === "player1" ? p1_id : p2_id;
    const outcomeText = result.winner === "tie"
      ? `🤝  *Tie — $${parseFloat(amount).toFixed(2)} each refunded*`
      : `🏆  <@${winnerId}> wins *$${pot} USDC!*`;

    await axios.post("https://slack.com/api/chat.postMessage", {
      channel: channel_id,
      text: `Pick-a-Number result: target was ${result.target}`,
      blocks: [
        b.text(`🎯 *Pick-a-Number* — $${parseFloat(amount).toFixed(2)} USDC\n🎲 The number was *${result.target}*`),
        {
          type: "context",
          elements: [
            { type: "image", image_url: p1Info.avatar, alt_text: p1Info.name },
            { type: "mrkdwn", text: `*${p1Info.name}* picked *${result.player1_number}* — ${fmt(result.player1_distance)}` },
          ],
        },
        {
          type: "context",
          elements: [
            { type: "image", image_url: p2Info.avatar, alt_text: p2Info.name },
            { type: "mrkdwn", text: `*${p2Info.name}* picked *${result.player2_number}* — ${fmt(result.player2_distance)}` },
          ],
        },
        b.text(outcomeText),
      ],
    }, { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong.";
    console.error("[picknum] error:", err.message, err.response?.data);
    await axios.post("https://slack.com/api/chat.postMessage", {
      channel: channel_id,
      text: `:warning: Game failed: ${msg}`,
    }, { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } });
  }
}

module.exports = { onP1Pick, onJoin, onP2Submit };
