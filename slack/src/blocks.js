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

function image(url, altText) {
  return { type: "image", image_url: url, alt_text: altText };
}

function textWithThumbnail(content, imageUrl, altText) {
  return {
    type: "section",
    text: { type: "mrkdwn", text: content },
    accessory: { type: "image", image_url: imageUrl, alt_text: altText },
  };
}

function actions(...elements) {
  return { type: "actions", elements };
}

function button(label, actionId, value, style = null) {
  const el = { type: "button", action_id: actionId, text: { type: "plain_text", text: label, emoji: true }, value };
  if (style) el.style = style;
  return el;
}

function staticSelect(actionId, placeholder, options) {
  return {
    type: "static_select",
    action_id: actionId,
    placeholder: { type: "plain_text", text: placeholder, emoji: true },
    options: options.map(([label, value]) => ({ text: { type: "plain_text", text: label, emoji: true }, value })),
  };
}

function error(message) {
  return ephemeral([text(`:warning:  ${message}`)], message);
}

function input(blockId, label, actionId, placeholder, initialValue = null) {
  const element = {
    type: "plain_text_input",
    action_id: actionId,
    placeholder: { type: "plain_text", text: placeholder, emoji: true },
  };
  if (initialValue) element.initial_value = initialValue;
  return {
    type: "input",
    block_id: blockId,
    label: { type: "plain_text", text: label, emoji: true },
    element,
  };
}

function textarea(blockId, label, actionId, placeholder) {
  return {
    type: "input",
    block_id: blockId,
    label: { type: "plain_text", text: label, emoji: true },
    element: {
      type: "plain_text_input",
      action_id: actionId,
      multiline: true,
      placeholder: { type: "plain_text", text: placeholder, emoji: true },
    },
  };
}

function userSelect(blockId, label, actionId, placeholder) {
  return {
    type: "input",
    block_id: blockId,
    label: { type: "plain_text", text: label, emoji: true },
    element: {
      type: "users_select",
      action_id: actionId,
      placeholder: { type: "plain_text", text: placeholder, emoji: true },
    },
  };
}

function datetimePicker(blockId, label, actionId) {
  return {
    type: "input",
    block_id: blockId,
    label: { type: "plain_text", text: label, emoji: true },
    element: {
      type: "datetimepicker",
      action_id: actionId,
    },
  };
}

function modal(callbackId, title, submitLabel, blocks, privateMetadata = null) {
  const view = {
    type: "modal",
    callback_id: callbackId,
    title: { type: "plain_text", text: title, emoji: true },
    submit: { type: "plain_text", text: submitLabel, emoji: true },
    close: { type: "plain_text", text: "Cancel", emoji: true },
    blocks,
  };
  if (privateMetadata) view.private_metadata = privateMetadata;
  return view;
}

module.exports = { header, divider, text, fields, context, image, textWithThumbnail, actions, button, staticSelect, input, textarea, userSelect, datetimePicker, modal, ephemeral, inChannel, error };
