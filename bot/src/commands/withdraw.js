const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { ethers } = require("ethers");
const api = require("../api");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw USDC to your wallet")
    .addNumberOption((opt) =>
      opt.setName("amount").setDescription("Amount in USDC").setRequired(true).setMinValue(0.01)
    )
    .addStringOption((opt) =>
      opt.setName("address").setDescription("Your Base wallet address (0x...)").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const amount = interaction.options.getNumber("amount");
    const address = interaction.options.getString("address");

    if (!ethers.isAddress(address)) {
      return interaction.editReply("Invalid wallet address. Make sure it's a valid 0x address.");
    }

    try {
      const result = await api.withdraw(interaction.user.id, amount, address);

      await interaction.editReply(
        `**Withdrawal submitted!**\n` +
        `Amount: $${parseFloat(result.amount_usdc).toFixed(2)} USDC\n` +
        `To: \`${result.to_address}\`\n` +
        `Status: ${result.status}\n\n` +
        `_Transaction will be sent within a few minutes._`
      );
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong.";
      await interaction.editReply(`Error: ${msg}`);
    }
  },
};
