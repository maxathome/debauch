const api = require("../api");
const b = require("../blocks");
const { gasWarning } = require("../services/gas-check");

module.exports = async function house(req, res) {
  try {
    const [data, warning] = await Promise.all([api.getHouseBalance(), gasWarning()]);
    const balance = `$${parseFloat(data.balance_usdc).toFixed(2)} USDC`;

    const blocks = [b.text(`🏦 *House Balance*\n${balance}`)];
    if (warning) blocks.push(b.text(warning));

    res.json(b.inChannel(blocks, `House balance: ${balance}`));
  } catch (err) {
    res.json(b.error("Error fetching house balance. Try again."));
  }
};
