require("dotenv").config();
const express = require("express");
const verifySlack = require("./middleware/verify-slack");
const verifyChannel = require("./middleware/verify-channel");

const balance  = require("./commands/balance");
const coinflip = require("./commands/coinflip");
const picknum  = require("./commands/picknum");
const bet      = require("./commands/bet");
const bets     = require("./commands/bets");
const deposit  = require("./commands/deposit");
const withdraw = require("./commands/withdraw");
const house    = require("./commands/house");
const donate   = require("./commands/donate");

const coinflipInteraction = require("./interactions/coinflip");
const picknumInteraction  = require("./interactions/picknum");
const betInteraction      = require("./interactions/bet");
const betsInteraction     = require("./interactions/bets");
const depositInteraction  = require("./interactions/deposit");
const withdrawInteraction = require("./interactions/withdraw");

const app = express();

// Parse URL-encoded bodies (Slack's format) and preserve raw body for signature verification
app.use((req, res, next) => { console.log(`[request] ${req.method} ${req.path}`); next(); });

app.use(express.urlencoded({
  extended: true,
  verify: (req, res, buf) => { req.rawBody = buf.toString(); },
}));

app.use(verifySlack);

// Slash commands — enforce channel restriction
app.post("/slack/balance",  verifyChannel, balance);
app.post("/slack/coinflip", verifyChannel, coinflip);
app.post("/slack/picknum",  verifyChannel, picknum);
app.post("/slack/deposit",  verifyChannel, deposit);
app.post("/slack/withdraw", verifyChannel, withdraw);
app.post("/slack/house",    verifyChannel, house);
app.post("/slack/donate",   verifyChannel, donate);
app.post("/slack/bet",      verifyChannel, bet);
app.post("/slack/checkbets", verifyChannel, bets);

// Interactive component handler
app.post("/slack/interact", async (req, res) => {
  const payload = JSON.parse(req.body.payload);

  if (payload.type === "block_actions") {
    const action = payload.actions[0];
    res.send(""); // Acknowledge immediately

    try {
      if (action.action_id === "flip_heads" || action.action_id === "flip_tails") {
        await coinflipInteraction.onFlip(payload, action);
      } else if (action.action_id.startsWith("picknum_p1_")) {
        await picknumInteraction.onP1Pick(payload, action);
      } else if (action.action_id === "picknum_join") {
        await picknumInteraction.onJoin(payload, action);
      } else if (action.action_id === "bet_accept") {
        await betInteraction.onAccept(payload, action);
      } else if (action.action_id === "bet_decline") {
        await betInteraction.onDecline(payload, action);
      } else if (action.action_id === "bet_resolve_p1") {
        await betInteraction.onResolve(payload, action, "p1");
      } else if (action.action_id === "bet_resolve_p2") {
        await betInteraction.onResolve(payload, action, "p2");
      } else if (action.action_id === "bet_cancel") {
        await betInteraction.onCancel(payload, action);
      } else if (action.action_id === "bets_filter_mine" || action.action_id === "bets_filter_all" || action.action_id === "bets_filter_others") {
        await betsInteraction.onFilter(payload, action);
      } else if (action.action_id === "bets_post_bet") {
        await betsInteraction.onPostBet(payload, action);
      }
    } catch (err) {
      console.error("[interact] Error handling action:", err.message, err.response?.data);
    }
  } else if (payload.type === "view_submission") {
    if (payload.view.callback_id === "deposit_register") {
      await depositInteraction.onRegister(payload, res);
    } else if (payload.view.callback_id === "withdraw_submit") {
      await withdrawInteraction.onSubmit(payload, res);
    } else if (payload.view.callback_id === "picknum_p2") {
      await picknumInteraction.onP2Submit(payload, res);
    } else if (payload.view.callback_id === "bet_create") {
      await betInteraction.onBetCreate(payload, res);
    } else {
      res.send("");
    }
  } else {
    res.send("");
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`[slack] Listening on port ${PORT}`));
