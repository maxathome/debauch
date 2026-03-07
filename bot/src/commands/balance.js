const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../api");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your Debauch wallet balance"),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await api.getOrCreateUser(interaction.user.id, interaction.user.username);
      const wallet = await api.getWallet(interaction.user.id);

      await interaction.editReply(
        `**Your Balance:** $${parseFloat(wallet.balance_usdc).toFixed(2)} USDC`
      );
    } catch (err) {
      await interaction.editReply("Error fetching balance. Try again.");
    }
  },
};
