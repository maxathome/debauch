require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});
const { Client, GatewayIntentBits, Partials, Collection, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel, Partials.Message],
});
client.commands = new Collection();

// Load all commands
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter((f) => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

const betCommand       = require("./commands/bet");
const checkbetsCommand = require("./commands/checkbets");

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const reply = { content: "Something went wrong.", flags: MessageFlags.Ephemeral };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch (replyErr) {
        console.error("[bot] Failed to send error reply:", replyErr.message);
      }
    }
    return;
  }

  // Button interactions
  if (interaction.isButton()) {
    const id = interaction.customId;
    try {
      if (id.startsWith("bet_accept:")) {
        await betCommand.handleAccept(interaction);
      } else if (id.startsWith("bet_decline:")) {
        await betCommand.handleDecline(interaction);
      } else if (id.startsWith("checkbets_post:")) {
        await checkbetsCommand.handlePost(interaction);
      } else if (id.startsWith("checkbets_")) {
        await checkbetsCommand.handleFilter(interaction);
      }
    } catch (err) {
      console.error(`[bot] Button handler error (${id}):`, err.message);
      try {
        const reply = { content: "Something went wrong.", flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch {}
    }
    return;
  }
});

client.on("error", (err) => console.error("[bot] Client error:", err.message));

client.login(process.env.DISCORD_TOKEN);
