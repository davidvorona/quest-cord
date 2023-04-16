import path from "path";
import { parseJson, readFile } from "../util";
import { ConfigJson, AuthJson } from "../types";

const configPath = path.join(__dirname, "../../config/config.json");
const {
    GUILD_ID,
    CLIENT_ID,
    DATA_DIR,
    FORCE_ENCOUNTER_TYPE
} = parseJson(readFile(configPath)) as ConfigJson;
const authPath = path.join(__dirname, "../../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;

const config = {
    authToken: TOKEN,
    guildId: GUILD_ID,
    clientId: CLIENT_ID,
    dataDir: DATA_DIR,
    forceEncounterType: FORCE_ENCOUNTER_TYPE
} as const;

const logConfig = { ...config };
logConfig.authToken = "xxx";
console.info("Loaded config:", logConfig);

export default config;
