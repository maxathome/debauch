const api = require("../api");

// Usage:
//   /deposit           — show deposit address and current balance
//   /deposit register 0x...  — link your wallet address

module.exports = async function deposit(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);

  if (args[0] === "register") {
    const address = args[1];
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.json({ response_type: "ephemeral", text: "Usage: `/deposit register 0x...` — must be a valid Base wallet address." });
    }

    try {
      await api.getOrCreateUser(user_id, user_name);
      await api.registerWallet(user_id, address);
      res.json({ response_type: "ephemeral", text: `Wallet registered: \`${address}\`\nDeposits from this address will be auto-credited.` });
    } catch (err) {
      res.json({ response_type: "ephemeral", text: "Error registering wallet. Try again." });
    }
    return;
  }

  const address = process.env.BOT_WALLET_ADDRESS;
  if (!address) {
    return res.json({ response_type: "ephemeral", text: "Deposits are not configured yet." });
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const wallet = await api.getWallet(user_id);
    res.json({
      response_type: "ephemeral",
      text: `*How to deposit USDC on Base:*\n\n1. Register your wallet: \`/deposit register <your_address>\`\n2. Send USDC (Base network) to:\n\`${address}\`\n3. Your balance is auto-credited within 30 seconds.\n\n*Current balance:* $${parseFloat(wallet.balance_usdc).toFixed(2)} USDC\n\n_Min deposit: $0.10 USDC. Network fees ~$0.001 on Base._`,
    });
  } catch (err) {
    res.json({ response_type: "ephemeral", text: "Error fetching deposit info. Try again." });
  }
};
