const api = require("../api");
const b = require("../blocks");

async function onRegister(payload, res) {
  const { id: user_id, name: user_name } = payload.user;
  const address = payload.view.state.values.wallet_block.wallet_input.value;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.json({
      response_action: "errors",
      errors: { wallet_block: "Must be a valid Base wallet address (0x followed by 40 hex characters)." },
    });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    await api.registerWallet(user_id, address);
    res.json({ response_action: "clear" });
  } catch (err) {
    const msg = err.response?.data?.error || "Something went wrong.";
    res.json({
      response_action: "errors",
      errors: { wallet_block: msg },
    });
  }
}

module.exports = { onRegister };
