require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  console.log(`Registering ${commands.length} slash commands...`);
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    { body: commands }
  );
  console.log("Done!");
})();
