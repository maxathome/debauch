const b = require("../blocks");

module.exports = async function bets(req, res) {
  res.json(b.ephemeral([
    b.text("📋 *Active Bets*\nChoose which bets to view:"),
    b.actions(
      b.button("👤  My Bets",      "bets_filter_mine",   "mine"),
      b.button("🌐  All Bets",     "bets_filter_all",    "all"),
      b.button("👥  Others' Bets", "bets_filter_others", "others"),
    ),
  ], "Active Bets"));
};
