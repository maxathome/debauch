const b = require("../blocks");

const AMOUNTS = [
  ["$0.25", "0.25"],
  ["$0.50", "0.50"],
  ["$1.00", "1.00"],
  ["$2.00", "2.00"],
  ["$5.00", "5.00"],
  ["$10.00", "10.00"],
];

const NUMBERS = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

module.exports = async function picknum(req, res) {
  res.json(b.ephemeral([
    b.text("🎯 *Pick-a-Number*\nFirst, select your bet amount:"),
    b.actions(b.staticSelect("picknum_amount", "Bet amount...", AMOUNTS)),
    b.actions(...NUMBERS.map(n => b.button(n, `picknum_p1_${n}`, n))),
    b.context("Pick a number 1–10. Closest to the target wins the pot."),
  ], "Pick-a-Number — select amount and pick a number"));
};
