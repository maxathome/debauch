const { SlashCommandBuilder } = require("discord.js");
const api = require("../api");
const { gasWarning } = require("../services/gas-check");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("house")
    .setDescription("Check how much the house has — games close at $0.00"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const [house, warning] = await Promise.all([api.getHouseBalance(), gasWarning()]);
      const balance = parseFloat(house.balance_usdc);
      const status = balance > 0 ? "Games are open." : "House is broke — games are closed!";

      let reply = `**House Balance:** $${balance.toFixed(2)} USDC\n${status}`;
      if (warning) reply += `\n\n${warning.replace(/\*/g, "**")}`;

      await interaction.editReply(reply);
    } catch (err) {
      await interaction.editReply("Error fetching house balance. Try again.");
    }
  },
};
