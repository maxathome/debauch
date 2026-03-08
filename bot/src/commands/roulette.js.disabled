const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const api = require("../api");

const MIN_BET = 0.01;
const MAX_BET = 10.00;

const COLOR_EMOJI = { red: "🔴", black: "⚫", green: "🟢" };

function betLabel(betType, betValue) {
  if (betType === "number") return `#${betValue}`;
  return betType.charAt(0).toUpperCase() + betType.slice(1);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Spin the wheel. Bet on a number (35:1), color, odd/even, or low/high (1:1).")
    .addStringOption((opt) =>
      opt.setName("bet_type")
        .setDescription("What to bet on")
        .setRequired(true)
        .addChoices(
          { name: "Number (35:1)", value: "number" },
          { name: "Red (1:1)",     value: "red" },
          { name: "Black (1:1)",   value: "black" },
          { name: "Odd (1:1)",     value: "odd" },
          { name: "Even (1:1)",    value: "even" },
          { name: "Low 1-18 (1:1)",  value: "low" },
          { name: "High 19-36 (1:1)", value: "high" }
        )
    )
    .addNumberOption((opt) =>
      opt.setName("amount")
        .setDescription("Amount to bet in USDC (e.g. 0.10)")
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    )
    .addIntegerOption((opt) =>
      opt.setName("number")
        .setDescription("Number to bet on (0–36). Required when bet_type is Number.")
        .setMinValue(0)
        .setMaxValue(36)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const betType = interaction.options.getString("bet_type");
    const amount  = interaction.options.getNumber("amount");
    const number  = interaction.options.getInteger("number");

    if (betType === "number" && number === null) {
      return interaction.editReply("You must provide a number (0–36) when betting on a specific number.");
    }

    try {
      await api.getOrCreateUser(interaction.user.id, interaction.user.username);
      const result = await api.roulette(
        interaction.user.id,
        betType,
        amount,
        betType === "number" ? String(number) : null
      );

      const emoji   = COLOR_EMOJI[result.spin_color] || "";
      const spinStr = `${emoji} **${result.spin}** (${result.spin_color})`;
      const bet     = betLabel(betType, betType === "number" ? number : null);
      const outcome = result.won
        ? `**${interaction.user.username} wins $${parseFloat(result.payout).toFixed(2)} USDC!**`
        : `**${interaction.user.username} loses $${parseFloat(result.amount).toFixed(2)} USDC.**`;

      await interaction.editReply(
        `${interaction.user} bet **${bet}** for $${parseFloat(result.amount).toFixed(2)}\n\n` +
        `The wheel lands on ${spinStr}\n\n` +
        `${outcome}`
      );

      await interaction.followUp({
        content: `Your balance: $${parseFloat(result.balance_usdc).toFixed(2)} USDC`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong. Check your balance.";
      await interaction.editReply(`Error: ${msg}`);
    }
  },
};
