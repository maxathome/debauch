const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { ethers } = require("ethers");
const api = require("../api");
const { sendUsdc } = require("../services/usdc-transfer");

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

    const amount  = interaction.options.getNumber("amount");
    const address = interaction.options.getString("address");

    if (!ethers.isAddress(address)) {
      return interaction.editReply("❌ Invalid wallet address. Make sure it's a valid 0x address.");
    }

    let wallet;
    try {
      wallet = await api.getWallet(interaction.user.id);
    } catch {
      return interaction.editReply("❌ Could not find your account.");
    }

    if (parseFloat(wallet.balance_usdc) < amount) {
      return interaction.editReply(`❌ Insufficient balance. You have $${parseFloat(wallet.balance_usdc).toFixed(2)} USDC.`);
    }

    await interaction.editReply("⏳ Sending transaction...");

    try {
      const txHash = await sendUsdc(address, amount);
      await api.withdraw(interaction.user.id, amount, address, txHash);

      await interaction.editReply(
        `✅ **Withdrawal sent!**\n` +
        `Amount: $${amount.toFixed(2)} USDC\n` +
        `To: \`${address}\`\n` +
        `Tx: \`${txHash}\``
      );
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Something went wrong.";
      await interaction.editReply(`❌ Withdrawal failed: ${msg}`);
    }
  },
};
