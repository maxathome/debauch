const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { ethers } = require("ethers");
const api = require("../api");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit USDC into your Debauch wallet")
    .addSubcommand((sub) =>
      sub.setName("info").setDescription("Get the deposit address and instructions")
    )
    .addSubcommand((sub) =>
      sub
        .setName("register")
        .setDescription("Register your wallet address so deposits are auto-credited")
        .addStringOption((opt) =>
          opt.setName("address").setDescription("Your Base wallet address (0x...)").setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "info") {
      const address = process.env.BOT_WALLET_ADDRESS;

      if (!address) {
        return interaction.editReply("Deposits are not yet configured. Ask the server admin to set up the bot wallet.");
      }

      try {
        await api.getOrCreateUser(interaction.user.id, interaction.user.username);
        const wallet = await api.getWallet(interaction.user.id);

        await interaction.editReply(
          `**How to deposit USDC on Base:**\n\n` +
          `1. Register your wallet: \`/deposit register <your_address>\`\n` +
          `2. Send USDC (Base network) to:\n\`${address}\`\n` +
          `3. Your balance is auto-credited within 30 seconds.\n\n` +
          `**Current balance:** $${parseFloat(wallet.balance_usdc).toFixed(2)} USDC\n\n` +
          `_Min deposit: $0.10 USDC. Network fees ~$0.001 on Base._`
        );
      } catch (err) {
        await interaction.editReply("Error fetching deposit info. Try again.");
      }
    }

    if (subcommand === "register") {
      const address = interaction.options.getString("address");

      if (!ethers.isAddress(address)) {
        return interaction.editReply("Invalid wallet address. Make sure it's a valid 0x address.");
      }

      try {
        await api.getOrCreateUser(interaction.user.id, interaction.user.username);
        await api.registerWallet(interaction.user.id, address);
        await interaction.editReply(
          `**Wallet registered!**\n\`${address}\`\n\nDeposits from this address will be auto-credited to your account.`
        );
      } catch (err) {
        await interaction.editReply("Error registering wallet. Try again.");
      }
    }
  },
};
