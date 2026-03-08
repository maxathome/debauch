const api = require("../api");

module.exports = async function house(req, res) {
  try {
    const data = await api.getHouseBalance();
    res.json({ response_type: "in_channel", text: `:bank: House balance: *$${parseFloat(data.balance_usdc).toFixed(2)} USDC*` });
  } catch (err) {
    res.json({ response_type: "ephemeral", text: "Error fetching house balance. Try again." });
  }
};
