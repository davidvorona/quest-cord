const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const commands = require("../config/commands");
const { CLIENT_ID, GUILD_ID } = require("../config/config.json");
const { TOKEN } = require("../config/auth.json");

const rest = new REST({ version: "9" }).setToken(TOKEN);

(async () => {
    try {
        console.log("Started refreshing guild application (/) commands.");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }
})();
