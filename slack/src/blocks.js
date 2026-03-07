// Block Kit helpers for consistent Slack message formatting

function header(emoji, title) {
  return { type: "section", text: { type: "mrkdwn", text: `${emoji}  *${title}*` } };
}

function divider() {
  return { type: "divider" };
}

function text(content) {
  return { type: "section", text: { type: "mrkdwn", text: content } };
}

function fields(...pairs) {
  // pairs = [["Label", "Value"], ...]
  return {
    type: "section",
    fields: pairs.map(([label, value]) => ({
      type: "mrkdwn",
      text: `*${label}*\n${value}`,
    })),
  };
}

function context(content) {
  return { type: "context", elements: [{ type: "mrkdwn", text: content }] };
}

function ephemeral(blocks, fallback) {
  return { response_type: "ephemeral", text: fallback, blocks };
}

function inChannel(blocks, fallback) {
  return { response_type: "in_channel", text: fallback, blocks };
}

function error(message) {
  return ephemeral([text(`:warning:  ${message}`)], message);
}

module.exports = { header, divider, text, fields, context, ephemeral, inChannel, error };
