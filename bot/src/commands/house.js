const { SlashCommandBuilder } = require("discord.js");
const api = require("../api");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("house")
    .setDescription("Check how much the house has — games close at $0.00"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const house = await api.getHouseBalance();
      const balance = parseFloat(house.balance_usdc);
      const status = balance > 0 ? "Games are open." : "House is broke — games are closed!";

      await interaction.editReply(
        `**House Balance:** $${balance.toFixed(2)} USDC\n${status}`
      );
    } catch (err) {
      await interaction.editReply("Error fetching house balance. Try again.");
    }
  },
};
