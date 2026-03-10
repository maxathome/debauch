const api = require("../api");
const { sendUsdc } = require("../services/usdc-transfer");

async function onSubmit(payload, res) {
  const { id: user_id, name: user_name } = payload.user;
  const values = payload.view.state.values;
  const amount  = values.amount_block.amount_input.value;
  const address = values.address_block.address_input.value;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.json({
      response_action: "errors",
      errors: { address_block: "Must be a valid Base wallet address (0x followed by 40 hex characters)." },
    });
  }

  // Validate amount is a positive number before hitting the chain
  const parsedAmount = parseFloat(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return res.json({
      response_action: "errors",
      errors: { amount_block: "Enter a valid amount greater than 0." },
    });
  }

  // Close the modal — on-chain tx takes a few seconds
  res.json({ response_action: "clear" });

  try {
    await api.getOrCreateUser(user_id, user_name);
    const txHash = await sendUsdc(address, parsedAmount);
    await api.withdraw(user_id, amount, address, txHash);
  } catch (err) {
    // Balance is only debited after the on-chain tx succeeds, so the user is safe.
    console.error("[withdraw] failed:", err.response?.data || err.message);
  }
}

module.exports = { onSubmit };
