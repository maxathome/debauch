const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const api = require("../api");

const FILTER_LABELS = { mine: "👤 My Bets", all: "🌐 All Bets", others: "👥 Others' Bets" };
const STATUS_LABEL  = { pending_acceptance: "⏳ Awaiting acceptance", active: "🤝 Active" };

function filterRow(current) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("checkbets_mine")
      .setLabel("👤  My Bets")
      .setStyle(current === "mine" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("checkbets_all")
      .setLabel("🌐  All Bets")
      .setStyle(current === "all" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("checkbets_others")
      .setLabel("👥  Others' Bets")
      .setStyle(current === "others" ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );
}

function betEmbed(bet) {
  const pot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);
  const status = STATUS_LABEL[bet.status] || bet.status;
  return new EmbedBuilder()
    .setTitle(bet.description)
    .setColor(bet.status === "active" ? 0x57F287 : 0xFEE75C)
    .addFields(
      { name: `🏆 ${bet.player1_username} wins if`, value: bet.player1_wins_if },
      { name: `🏆 ${bet.player2_username} wins if`, value: bet.player2_wins_if },
      { name: "⚔️ Players",       value: `${bet.player1_username} vs ${bet.player2_username}`, inline: true },
      { name: "👨‍⚖️ Arbitrator", value: bet.arbitrator_username,                              inline: true },
      { name: "💰 Pot",           value: `$${pot} USDC`,                                       inline: true },
      { name: "📅 Resolve after", value: `<t:${bet.resolve_after}:f>`,                         inline: true },
      { name: "Status",           value: status,                                                inline: true },
      { name: "Bet ID",           value: String(bet.id),                                        inline: true },
    );
}

function postRow(betId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`checkbets_post:${betId}`)
      .setLabel("📣  Post to Channel")
      .setStyle(ButtonStyle.Secondary),
  );
}

async function buildResponse(filter, userId, currentChannelId) {
  const bets = await api.getBets(filter, userId);
  const label = FILTER_LABELS[filter] || "Bets";

  if (!bets.length) {
    return {
      content: `📋 **${label}** — No unresolved bets found.`,
      embeds: [],
      components: [filterRow(filter)],
    };
  }

  return {
    content: `📋 **${label}** — ${bets.length} unresolved`,
    embeds: bets.map(betEmbed),
    components: [
      filterRow(filter),
      ...bets.map((bet) => postRow(bet.id)),
    ],
  };
}

// Button handler: checkbets_mine / checkbets_all / checkbets_others
async function handleFilter(interaction) {
  await interaction.deferUpdate();
  const filter = interaction.customId.replace("checkbets_", "");
  const response = await buildResponse(filter, interaction.user.id, interaction.channelId);
  await interaction.editReply(response);
}

// Button handler: checkbets_post:<betId>
async function handlePost(interaction) {
  const betId = interaction.customId.split(":")[1];
  const bet = await api.getBet(betId);

  await interaction.reply({
    content: `✅ Posted bet **#${betId}** to channel.`,
    flags: MessageFlags.Ephemeral,
  });

  await interaction.channel.send({
    content: `📣 <@${bet.player1_id}> vs <@${bet.player2_id}> — what's the status on this? <@${bet.arbitrator_id}>`,
    embeds: [betEmbed(bet)],
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkbets")
    .setDescription("View unresolved bets"),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const response = await buildResponse("mine", interaction.user.id, interaction.channelId);
    await interaction.editReply(response);
  },

  handleFilter,
  handlePost,
};
