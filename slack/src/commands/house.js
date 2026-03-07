const api = require("../api");
const b = require("../blocks");

module.exports = async function house(req, res) {
  try {
    const data = await api.getHouseBalance();
    const balance = `$${parseFloat(data.balance_usdc).toFixed(2)} USDC`;

    res.json(b.inChannel([
      b.header("🏦", "House Balance"),
      b.divider(),
      b.text(`*${balance}*`),
    ], `House balance: ${balance}`));
  } catch (err) {
    res.json(b.error("Error fetching house balance. Try again."));
  }
};
