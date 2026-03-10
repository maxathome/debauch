const axios = require("axios");
const b = require("../blocks");
const api = require("../api");

const SLACK_TOKEN = () => process.env.SLACK_BOT_TOKEN;

const FILTER_LABELS = { mine: "My Bets", all: "All Bets", others: "Others' Bets" };
const STATUS_EMOJI  = { pending_acceptance: "⏳", active: "🤝" };
const STATUS_LABEL  = { pending_acceptance: "Awaiting acceptance", active: "Active" };

function formatResolveAfter(unixTs) {
  return `<!date^${unixTs}^{date_short_pretty} at {time}|${new Date(unixTs * 1000).toLocaleString()}>`;
}

function betBlocks(bets, filter, userId) {
  const title = FILTER_LABELS[filter] || "Active Bets";

  if (!bets.length) {
    return [
      b.text(`📋 *${title}*`),
      b.text("_No unresolved bets found._"),
      filterActions(filter),
    ];
  }

  const betSections = bets.flatMap((bet) => {
    const statusIcon = STATUS_EMOJI[bet.status] || "❓";
    const statusLabel = STATUS_LABEL[bet.status] || bet.status;
    const pot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);

    return [
      b.text(
        `${statusIcon} *${bet.description}*\n` +
        `🏆 *${bet.player1_username}* wins if: ${bet.player1_wins_if}\n` +
        `🏆 *${bet.player2_username}* wins if: ${bet.player2_wins_if}`
      ),
      b.fields(
        ["⚔️ Players",      `${bet.player1_username}  vs  ${bet.player2_username}`],
        ["👨‍⚖️ Arbitrator", bet.arbitrator_username],
        ["💰 Pot",          `$${pot} USDC`],
        ["📅 Resolve after", formatResolveAfter(bet.resolve_after)],
        ["Status",          statusLabel],
        ["Bet ID",          String(bet.id)],
      ),
      b.actions(b.button("📣  Post to Channel", "bets_post_bet", String(bet.id))),
      b.divider(),
    ];
  });

  return [
    b.text(`📋 *${title}* — ${bets.length} unresolved`),
    b.divider(),
    ...betSections,
    filterActions(filter),
  ];
}

function filterActions(current) {
  return b.actions(
    b.button("👤  My Bets",      "bets_filter_mine",   "mine",   current === "mine"   ? "primary" : null),
    b.button("🌐  All Bets",     "bets_filter_all",    "all",    current === "all"    ? "primary" : null),
    b.button("👥  Others' Bets", "bets_filter_others", "others", current === "others" ? "primary" : null),
  );
}

// Block action: bets_filter
async function onFilter(payload, action) {
  const filter = action.value;
  const userId = payload.user.id;

  const bets = await api.getBets(filter, userId);
  const blocks = betBlocks(bets, filter, userId);

  await axios.post(
    payload.response_url,
    { replace_original: true, text: FILTER_LABELS[filter], blocks },
  );
}

// Block action: bets_post_bet
async function onPostBet(payload, action) {
  const betId = action.value;
  const channelId = payload.channel?.id;

  const bet = await api.getBet(betId);
  const statusIcon = STATUS_EMOJI[bet.status] || "❓";
  const statusLabel = STATUS_LABEL[bet.status] || bet.status;
  const pot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);

  const blocks = [
    b.text(
      `${statusIcon} *${bet.description}*\n` +
      `🏆 *${bet.player1_username}* wins if: ${bet.player1_wins_if}\n` +
      `🏆 *${bet.player2_username}* wins if: ${bet.player2_wins_if}`
    ),
    b.fields(
      ["⚔️ Players",      `${bet.player1_username}  vs  ${bet.player2_username}`],
      ["👨‍⚖️ Arbitrator", bet.arbitrator_username],
      ["💰 Pot",          `$${pot} USDC`],
      ["📅 Resolve after", formatResolveAfter(bet.resolve_after)],
      ["Status",          statusLabel],
      ["Bet ID",          String(bet.id)],
    ),
  ];

  await axios.post(
    "https://slack.com/api/chat.postMessage",
    { channel: channelId, text: bet.description, blocks },
    { headers: { Authorization: `Bearer ${SLACK_TOKEN()}` } }
  );

  await axios.post(payload.response_url, {
    replace_original: false,
    response_type: "ephemeral",
    text: `✅ Posted bet #${bet.id} to channel.`,
  });
}

module.exports = { onFilter, onPostBet };
