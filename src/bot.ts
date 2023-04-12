import { Client, Guild, IntentsBitField, Events } from "discord.js";
import QuestLord from "./game/QuestLord";
import { defaultCompendiumReader as compendium } from "./services/CompendiumReader";
import setGuildCommands from "./commands";
import config from "./config";

const questLord = new QuestLord(compendium);

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds
    ]
});

client.on(Events.ClientReady, async () => {
    try {
        if (client.user) {
            console.info("Logged in as", client.user.tag);
        }
        if (client.application) {
            await Promise.all(client.guilds.cache.map(async (guild: Guild) => {
                await setGuildCommands(guild.id);
            }));
        }
    } catch (err) {
        console.error(err);
    }
});

client.on(Events.GuildCreate, async (guild: Guild) => {
    // Registers the default commands when the bot joins a guild
    await setGuildCommands(guild.id);
});

client.on(Events.InteractionCreate, (interaction) =>
    questLord.handleInteraction(interaction));

client.login(config.authToken);
