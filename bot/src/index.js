require("dotenv").config();
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");
const depositPoller = require("./services/deposit-poller");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load all commands
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter((f) => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
  depositPoller.start();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
});

client.on("error", (err) => console.error("[bot] Client error:", err.message));

client.login(process.env.DISCORD_TOKEN);
