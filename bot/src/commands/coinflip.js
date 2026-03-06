const { SlashCommandBuilder } = require("discord.js");
const api = require("../api");

const MIN_BET = 0.01;
const MAX_BET = 10.00;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin — pick heads or tails. Win 2x your bet, lose it all.")
    .addStringOption((opt) =>
      opt.setName("choice")
        .setDescription("Heads or tails?")
        .setRequired(true)
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" }
        )
    )
    .addNumberOption((opt) =>
      opt.setName("amount")
        .setDescription("Amount to bet in USDC (e.g. 0.10)")
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const choice = interaction.options.getString("choice");
    const amount = interaction.options.getNumber("amount");

    try {
      await api.getOrCreateUser(interaction.user.id, interaction.user.username);
      const result = await api.coinflip(interaction.user.id, choice, amount);

      const coin = result.result === "heads" ? "HEADS" : "TAILS";
      const outcome = result.won
        ? `**${interaction.user.username} wins $${parseFloat(result.payout).toFixed(2)} USDC!**`
        : `**${interaction.user.username} loses $${parseFloat(result.amount).toFixed(2)} USDC.**`;

      await interaction.editReply(
        `${interaction.user} picked **${choice.toUpperCase()}** — the coin lands **${coin}**\n\n` +
        `${outcome}`
      );

      await interaction.followUp({
        content: `Your balance: $${parseFloat(result.balance_usdc).toFixed(2)} USDC`,
        ephemeral: true,
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
      await interaction.editReply(`Error: ${msg}`);
    }
  },
};
