import path from "path";
import { Client, Intents } from "discord.js";
import QuestLord from "./game/QuestLord";
import { parseJson, readFile } from "./util";
import { AuthJson } from "./types";

const authPath = path.join(__dirname, "../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;

const questLord = new QuestLord();

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS
    ]
});

client.on("ready", async () => {
    try {
        if (client.user) {
            console.info("Logged in as", client.user.tag);
        }
        if (client.application) {
            console.info("Clearing any existing global application (/) commands");
        }
    } catch (err) {
        console.error(err);
    }
});

client.on("interactionCreate", (interaction) =>
    questLord.handleInteraction(interaction));

client.login(TOKEN);
