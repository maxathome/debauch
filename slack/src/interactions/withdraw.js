const api = require("../api");

async function onSubmit(payload, res) {
  const { id: user_id, name: user_name } = payload.user;
  const values = payload.view.state.values;
  const amount = values.amount_block.amount_input.value;
  const address = values.address_block.address_input.value;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.json({
      response_action: "errors",
      errors: { address_block: "Must be a valid Base wallet address (0x followed by 40 hex characters)." },
    });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    await api.withdraw(user_id, amount, address);
    res.json({ response_action: "clear" });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong.";
    res.json({
      response_action: "errors",
      errors: { amount_block: msg },
    });
  }
}

module.exports = { onSubmit };
