module.exports = function verifyChannel(req, res, next) {
  const allowed = process.env.ALLOWED_CHANNEL_ID;
  if (allowed && req.body.channel_id !== allowed) {
    return res.json({ response_type: "ephemeral", text: "This command can only be used in the designated channel." });
  }
  next();
};
