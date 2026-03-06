const { SlashCommandBuilder } = require("discord.js");
const api = require("../api");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Get your deposit address to top up your balance"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await api.getOrCreateUser(interaction.user.id, interaction.user.username);
      const wallet = await api.getWallet(interaction.user.id);
      const address = process.env.BOT_WALLET_ADDRESS;

      if (!address) {
        return interaction.editReply("Deposits are not yet configured. Ask the server admin to set up the bot wallet.");
      }

      await interaction.editReply(
        `**How to deposit USDC on Base:**\n\n` +
        `1. Send USDC (Base network) to:\n\`${address}\`\n\n` +
        `2. In the memo/note field, include your Discord ID: \`${interaction.user.id}\`\n\n` +
        `3. Your balance will be credited after 1 confirmation (~2 seconds on Base).\n\n` +
        `**Current balance:** $${parseFloat(wallet.balance_usdc).toFixed(2)} USDC\n\n` +
        `_Min deposit: $0.10 USDC. Network fees are ~$0.003._`
      );
    } catch (err) {
      await interaction.editReply("Error fetching deposit info. Try again.");
    }
  },
};
