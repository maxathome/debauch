const b = require("../blocks");

const AMOUNTS = [
  ["$0.25", "0.25"],
  ["$0.50", "0.50"],
  ["$1.00", "1.00"],
  ["$2.00", "2.00"],
  ["$5.00", "5.00"],
  ["$10.00", "10.00"],
];

module.exports = async function coinflip(req, res) {
  res.json(b.ephemeral([
    b.text("🪙 *Coin Flip*\nSelect your bet amount and pick a side:"),
    b.actions(
      b.staticSelect("amount_select", "Bet amount...", AMOUNTS),
      b.button("🟡  Heads", "flip_heads", "heads", "primary"),
      b.button("⚫  Tails", "flip_tails", "tails")
    ),
  ], "Coin Flip — select amount and side"));
};
