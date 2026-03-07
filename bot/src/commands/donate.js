const { SlashCommandBuilder } = require("discord.js");
const api = require("../api");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("donate")
    .setDescription("Donate USDC to the house to keep the games running")
    .addNumberOption((opt) =>
      opt.setName("amount")
        .setDescription("Amount to donate in USDC")
        .setRequired(true)
        .setMinValue(0.01)
        .setMaxValue(100.00)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getNumber("amount");

    try {
      await api.getOrCreateUser(interaction.user.id, interaction.user.username);
      await api.donateToHouse(interaction.user.id, amount);

      await interaction.editReply(
        `${interaction.user} just donated **$${amount.toFixed(2)} USDC** to the house! The games live on!`
      );
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
      await interaction.editReply(`Error: ${msg}`);
    }
  },
};
