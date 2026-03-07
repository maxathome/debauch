const api = require("../api");
const b = require("../blocks");

// Usage:
//   /deposit                   — show deposit address and balance
//   /deposit register 0x...    — link your wallet address

module.exports = async function deposit(req, res) {
  const { user_id, user_name, text } = req.body;
  const args = (text || "").trim().split(/\s+/);

  if (args[0] === "register") {
    const address = args[1];
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.json(b.error("Usage: `/deposit register 0x...`  —  must be a valid Base wallet address."));
    }

    try {
      await api.getOrCreateUser(user_id, user_name);
      await api.registerWallet(user_id, address);
      res.json(b.ephemeral([
        b.header("✅", "Wallet Registered"),
        b.divider(),
        b.text(`\`${address}\``),
        b.context("Deposits from this address will be auto-credited to your account."),
      ], `Wallet registered: ${address}`));
    } catch (err) {
      res.json(b.error("Error registering wallet. Try again."));
    }
    return;
  }

  const botAddress = process.env.BOT_WALLET_ADDRESS;
  if (!botAddress) {
    return res.json(b.error("Deposits are not configured yet."));
  }

  try {
    await api.getOrCreateUser(user_id, user_name);
    const wallet = await api.getWallet(user_id);
    const balance = `$${parseFloat(wallet.balance_usdc).toFixed(2)} USDC`;

    res.json(b.ephemeral([
      b.header("📥", "Deposit USDC"),
      b.divider(),
      b.text(`Send USDC on the *Base* network to:\n\`${botAddress}\``),
      b.divider(),
      b.fields(["Current Balance", balance]),
      b.context("1.  Register your sending wallet: `/deposit register <address>`\n2.  Send USDC to the address above\n3.  Balance auto-credited within 30 seconds\n\n_Min deposit: $0.10 · Network fees ~$0.001 on Base_"),
    ], `Deposit address: ${botAddress} | Balance: ${balance}`));
  } catch (err) {
    res.json(b.error("Error fetching deposit info. Try again."));
  }
};
