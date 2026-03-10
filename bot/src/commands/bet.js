const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const api = require("../api");
const betContract = require("../services/bet-contract");

function parseResolveDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: "${dateStr}". Use YYYY-MM-DD format.`);
  return Math.floor(d.getTime() / 1000);
}

function betEmbed(bet, { title, color } = {}) {
  const pot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);
  return new EmbedBuilder()
    .setTitle(title || bet.description)
    .setColor(color || 0x5865F2)
    .addFields(
      { name: `🏆 ${bet.player1_username} wins if`, value: bet.player1_wins_if },
      { name: `🏆 ${bet.player2_username} wins if`, value: bet.player2_wins_if },
      { name: "⚔️ Players",       value: `${bet.player1_username} vs ${bet.player2_username}`, inline: true },
      { name: "👨‍⚖️ Arbitrator", value: bet.arbitrator_username,                              inline: true },
      { name: "💰 Pot",           value: `$${pot} USDC`,                                       inline: true },
      { name: "📅 Resolve after", value: `<t:${bet.resolve_after}:f>`,                         inline: true },
      { name: "Bet ID",           value: String(bet.id),                                        inline: true },
    );
}

function acceptDeclineRow(betId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bet_accept:${betId}`).setLabel("✅  Accept").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bet_decline:${betId}`).setLabel("❌  Decline").setStyle(ButtonStyle.Danger),
  );
}

async function handleChallenge(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const opponent    = interaction.options.getUser("opponent");
  const arbitrator  = interaction.options.getUser("arbitrator");
  const amount      = interaction.options.getNumber("amount");
  const description = interaction.options.getString("description");
  const iWinIf      = interaction.options.getString("i_win_if");
  const theyWinIf   = interaction.options.getString("they_win_if");
  const dateStr     = interaction.options.getString("resolve_date");

  let resolveAfter;
  try {
    resolveAfter = parseResolveDate(dateStr);
  } catch (err) {
    return interaction.editReply({ content: `❌ ${err.message}` });
  }

  if (opponent.id === interaction.user.id) {
    return interaction.editReply({ content: "❌ You can't bet against yourself." });
  }
  if (arbitrator.id === interaction.user.id || arbitrator.id === opponent.id) {
    return interaction.editReply({ content: "❌ Arbitrator must be a third party — not a player in the bet." });
  }

  await api.getOrCreateUser(interaction.user.id, interaction.user.username);
  await api.getOrCreateUser(opponent.id, opponent.username);
  await api.getOrCreateUser(arbitrator.id, arbitrator.username);

  const bet = await api.createBet({
    player1_id:       interaction.user.id,
    player1_username: interaction.user.username,
    player2_id:       opponent.id,
    player2_username: opponent.username,
    arbitrator_id:    arbitrator.id,
    arbitrator_username: arbitrator.username,
    description,
    player1_wins_if:  iWinIf,
    player2_wins_if:  theyWinIf,
    amount_usdc:      amount,
    resolve_after:    resolveAfter,
    channel_id:       interaction.channelId,
  });

  await interaction.editReply({ content: `✅ Challenge sent to ${opponent}! Bet ID: **#${bet.id}**` });

  // DM p2
  try {
    const dmUser = await interaction.client.users.fetch(opponent.id);
    const dm = await dmUser.createDM();
    await dm.send({
      content: `⚔️ **${interaction.user.username}** has challenged you to a bet!`,
      embeds: [betEmbed(bet)],
      components: [acceptDeclineRow(bet.id)],
    });
  } catch (err) {
    console.error(`[bet] Failed to DM p2 ${opponent.id}:`, err.message);
    await interaction.followUp({
      content: `⚠️ Bet created but couldn't DM ${opponent} — they may have DMs disabled. Bet ID: **#${bet.id}**`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Async: create on-chain escrow
  betContract.createBet(resolveAfter, amount)
    .then(async (contractBetId) => {
      await api.updateBetContractId(bet.id, contractBetId);
      const current = await api.getBet(bet.id);
      if (current.status === "active") {
        await betContract.activateBet(contractBetId, parseFloat(current.amount_usdc));
      }
    })
    .catch(async (err) => {
      console.error(`[bet] On-chain escrow failed for bet #${bet.id}:`, err.message);
      try {
        await interaction.followUp({
          content: `⚠️ Bet **#${bet.id}** was created but the on-chain escrow failed: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {}
    });
}

async function handleResolve(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const betId  = interaction.options.getInteger("id");
  const winner = interaction.options.getUser("winner");

  let bet;
  try {
    bet = await api.getBet(betId);
  } catch {
    return interaction.editReply({ content: `❌ Bet #${betId} not found.` });
  }

  if (bet.arbitrator_id !== interaction.user.id) {
    return interaction.editReply({ content: "❌ Only the arbitrator can resolve this bet." });
  }
  if (bet.status !== "active") {
    return interaction.editReply({ content: `❌ Bet #${betId} is not active (status: ${bet.status}).` });
  }
  if (winner.id !== bet.player1_id && winner.id !== bet.player2_id) {
    return interaction.editReply({ content: "❌ Winner must be one of the two players." });
  }

  if (bet.contract_bet_id != null) {
    await betContract.resolveBet(bet.contract_bet_id);
  }

  const resolved = await api.resolveBet(betId, winner.id);
  const pot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);

  await interaction.editReply({ content: `✅ Bet #${betId} resolved.` });

  const channel = await interaction.client.channels.fetch(bet.channel_id).catch(() => null);
  if (channel) {
    await channel.send({
      embeds: [
        betEmbed(resolved, { title: `🏆 ${winner.username} wins "${bet.description}"`, color: 0x57F287 })
          .addFields({ name: "💸 Payout", value: `$${pot} USDC to ${winner}`, inline: true }),
      ],
    });
  }
}

async function handleCancel(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const betId = interaction.options.getInteger("id");

  let bet;
  try {
    bet = await api.getBet(betId);
  } catch {
    return interaction.editReply({ content: `❌ Bet #${betId} not found.` });
  }

  if (interaction.user.id !== bet.player1_id && interaction.user.id !== bet.arbitrator_id) {
    return interaction.editReply({ content: "❌ Only the bet creator or arbitrator can cancel." });
  }
  if (!["pending_acceptance", "active"].includes(bet.status)) {
    return interaction.editReply({ content: `❌ Bet #${betId} cannot be cancelled (status: ${bet.status}).` });
  }

  if (bet.contract_bet_id != null) {
    await betContract.cancelBet(bet.contract_bet_id);
  }

  await api.cancelBet(betId);

  await interaction.editReply({ content: `✅ Bet #${betId} cancelled. Stakes refunded.` });

  const channel = await interaction.client.channels.fetch(bet.channel_id).catch(() => null);
  if (channel) {
    await channel.send({
      embeds: [
        betEmbed(bet, { title: `❌ Bet cancelled: "${bet.description}"`, color: 0xED4245 }),
      ],
    });
  }
}

// Button handler: bet_accept:<betId>
async function handleAccept(interaction) {
  await interaction.deferUpdate();

  const betId = interaction.customId.split(":")[1];
  let bet;
  try {
    bet = await api.getBet(betId);
  } catch {
    return interaction.followUp({ content: "❌ Bet not found.", flags: MessageFlags.Ephemeral });
  }

  if (interaction.user.id !== bet.player2_id) {
    return interaction.followUp({ content: "❌ This challenge isn't for you.", flags: MessageFlags.Ephemeral });
  }
  if (bet.status !== "pending_acceptance") {
    return interaction.followUp({ content: `❌ Bet #${betId} is no longer pending.`, flags: MessageFlags.Ephemeral });
  }

  await api.acceptBet(betId);

  await interaction.editReply({
    content: `✅ You accepted the bet! Bet ID: **#${betId}**`,
    embeds: [betEmbed(bet, { title: `✅ Accepted: "${bet.description}"`, color: 0x57F287 })],
    components: [],
  });

  // Late-activate on-chain if contract was already created
  betContract.activateBet && (async () => {
    const current = await api.getBet(betId);
    if (current.contract_bet_id != null) {
      await betContract.activateBet(current.contract_bet_id, parseFloat(current.amount_usdc))
        .catch((err) => console.error(`[bet] activateBet failed for bet #${betId}:`, err.message));
    }
  })();

  const channel = await interaction.client.channels.fetch(bet.channel_id).catch(() => null);
  if (channel) {
    const pot = (parseFloat(bet.amount_usdc) * 2).toFixed(2);
    await channel.send({
      content: `🤝 <@${bet.player1_id}> vs <@${bet.player2_id}> — the bet is on! Arbitrated by <@${bet.arbitrator_id}>.`,
      embeds: [betEmbed(bet, { title: `🤝 Bet accepted: "${bet.description}"` })
        .addFields({ name: "💰 Pot locked", value: `$${pot} USDC in escrow` })],
    });
  }
}

// Button handler: bet_decline:<betId>
async function handleDecline(interaction) {
  await interaction.deferUpdate();

  const betId = interaction.customId.split(":")[1];
  let bet;
  try {
    bet = await api.getBet(betId);
  } catch {
    return interaction.followUp({ content: "❌ Bet not found.", flags: MessageFlags.Ephemeral });
  }

  if (interaction.user.id !== bet.player2_id) {
    return interaction.followUp({ content: "❌ This challenge isn't for you.", flags: MessageFlags.Ephemeral });
  }

  await api.declineBet(betId);

  await interaction.editReply({
    content: `❌ You declined the bet. Bet ID: **#${betId}**`,
    embeds: [betEmbed(bet, { title: `❌ Declined: "${bet.description}"`, color: 0xED4245 })],
    components: [],
  });

  try {
    const p1 = await interaction.client.users.fetch(bet.player1_id);
    const dm = await p1.createDM();
    await dm.send({ content: `❌ **${bet.player2_username}** declined your bet: *"${bet.description}"* (Bet ID: **#${betId}**)` });
  } catch (err) {
    console.error(`[bet] Failed to DM p1 about decline:`, err.message);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("PVP bets with on-chain escrow")
    .addSubcommand((sub) =>
      sub.setName("challenge")
        .setDescription("Challenge someone to a bet")
        .addUserOption((opt) => opt.setName("opponent").setDescription("Who you're betting against").setRequired(true))
        .addUserOption((opt) => opt.setName("arbitrator").setDescription("Trusted third party to call the winner").setRequired(true))
        .addNumberOption((opt) => opt.setName("amount").setDescription("Stake per player in USDC").setRequired(true).setMinValue(0.01).setMaxValue(10))
        .addStringOption((opt) => opt.setName("description").setDescription("What is this bet about?").setRequired(true))
        .addStringOption((opt) => opt.setName("i_win_if").setDescription("Condition for you to win").setRequired(true))
        .addStringOption((opt) => opt.setName("they_win_if").setDescription("Condition for your opponent to win").setRequired(true))
        .addStringOption((opt) => opt.setName("resolve_date").setDescription("Earliest resolve date (YYYY-MM-DD)").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("resolve")
        .setDescription("Declare a winner — arbitrator only")
        .addIntegerOption((opt) => opt.setName("id").setDescription("Bet ID").setRequired(true))
        .addUserOption((opt) => opt.setName("winner").setDescription("Who won?").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("cancel")
        .setDescription("Cancel a bet and refund both players")
        .addIntegerOption((opt) => opt.setName("id").setDescription("Bet ID").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "challenge") return handleChallenge(interaction);
    if (sub === "resolve")   return handleResolve(interaction);
    if (sub === "cancel")    return handleCancel(interaction);
  },

  handleAccept,
  handleDecline,
};
