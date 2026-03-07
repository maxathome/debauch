const crypto = require("crypto");

module.exports = function verifySlack(req, res, next) {
  const timestamp = req.headers["x-slack-request-timestamp"];
  const signature = req.headers["x-slack-signature"];

  if (!timestamp || !signature) {
    return res.status(401).json({ error: "Missing Slack headers" });
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) {
    return res.status(401).json({ error: "Request too old" });
  }

  const sigBase = `v0:${timestamp}:${req.rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET).update(sigBase).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
};
