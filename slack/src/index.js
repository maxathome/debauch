require("dotenv").config();
const express = require("express");
const verifySlack = require("./middleware/verify-slack");

const balance  = require("./commands/balance");
const coinflip = require("./commands/coinflip");
const roulette = require("./commands/roulette");
const deposit  = require("./commands/deposit");
const withdraw = require("./commands/withdraw");
const house    = require("./commands/house");
const donate   = require("./commands/donate");

const app = express();

// Parse URL-encoded bodies (Slack's format) and preserve raw body for signature verification
app.use(express.urlencoded({
  extended: true,
  verify: (req, res, buf) => { req.rawBody = buf.toString(); },
}));

app.use(verifySlack);

app.post("/slack/balance",  balance);
app.post("/slack/coinflip", coinflip);
app.post("/slack/roulette", roulette);
app.post("/slack/deposit",  deposit);
app.post("/slack/withdraw", withdraw);
app.post("/slack/house",    house);
app.post("/slack/donate",   donate);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`[slack] Listening on port ${PORT}`));
