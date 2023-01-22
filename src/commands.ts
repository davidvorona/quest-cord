import path from "path";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import { ConfigJson, AuthJson, AnyObject, CharacterClass } from "./types";
import { parseJson, readFile } from "./util";
import { COMMAND_TYPE, DIRECTION, FORMATTED_DIRECTION } from "./constants";
import { defaultCompendiumReader as compendium } from "./services/CompendiumReader";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultCommands = require("../config/commands");
const authPath = path.join(__dirname, "../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;
const configPath = path.join(__dirname, "../config/config.json");
const { CLIENT_ID } = parseJson(readFile(configPath)) as ConfigJson;

const rest = new REST({ version: "9" }).setToken(TOKEN);

interface CommandBuilderArgs {
    type: string;
    targets?: string[];
}

class CommandBuilder {
    type?: string;

    targets?: string[];

    constructor(args?: CommandBuilderArgs) {
        if (args) {
            this.type = args.type;
            if (args.targets) {
                this.targets = args.targets;
            }
        }
    }

    private buildIntegerChoices(name: string, value: number) {
        return { name, value };
    }

    private buildStringChoices(name: string, value: string) {
        return { name, value };
    }

    build(): AnyObject[] {
        const builtCommands = [];
        switch (this.type) {
        case COMMAND_TYPE.NEW_QUEST: {
            const choices = Object.values(compendium.data.classes).map(
                (c: CharacterClass) => this.buildStringChoices(c.name, c.id)
            );
            builtCommands.push(new SlashCommandBuilder()
                .setName("play")
                .setDescription("Create a character and embark on a quest")
                .addStringOption((option) => {
                    return option
                        .setName("class")
                        .setDescription("Pick a character class")
                        .addChoices(...choices);
                })
            );
            break;
        }
        case COMMAND_TYPE.TRAVEL: {
            const choices = [
                { name: FORMATTED_DIRECTION.NORTH, value: DIRECTION.NORTH },
                { name: FORMATTED_DIRECTION.SOUTH, value: DIRECTION.SOUTH },
                { name: FORMATTED_DIRECTION.EAST, value: DIRECTION.EAST },
                { name: FORMATTED_DIRECTION.WEST, value: DIRECTION.WEST },
            ];
            builtCommands.push(new SlashCommandBuilder()
                .setName("travel")
                .setDescription("What direction will you travel next?")
                .addStringOption((option) => {
                    return option
                        .setName("direction")
                        .setDescription("Pick the compass direction")
                        .addChoices(...choices);
                })
            );
            break;
        }
        case COMMAND_TYPE.ENCOUNTER: {
            const targets = this.targets as string[];
            const choices = targets.map((t, idx) => {
                const targetDescription = `${t} ${idx + 1}`;
                return this.buildIntegerChoices(targetDescription, idx);
            });
            builtCommands.push(new SlashCommandBuilder()
                .setName("attack")
                .setDescription("Strike at an enemy!")
                .addIntegerOption((option) => {
                    return option
                        .setName("target")
                        .setDescription("Who do you want to attack?")
                        .setRequired(true)
                        .addChoices(...choices);
                })
            );
            builtCommands.push(new SlashCommandBuilder()
                .setName("use")
                .setDescription("Use an item")
                .addStringOption((option) => {
                    return option
                        .setName("item")
                        .setDescription("Which item do you want to use?")
                        .setRequired(true);
                })
            );
            break;
        }
        default:
            break;
        }
        return [
            ...defaultCommands,
            ...builtCommands
        ];
    }
}


// NOTE: It seems (at least for guild commands) that Discord rate-limits requests to the
// PUT endpoint. The limit of clustered requests seems to be as low as 2, with the 3rd
// hanging for some time before a response is returned.
// TODO: is this true if the target guilds are different?
export default async function setGuildCommands(guildId: string, args?: CommandBuilderArgs) {
    const builder = new CommandBuilder(args);
    const commands = builder.build();
    try {
        console.log(`Refreshing application (/) commands for guild ${guildId}`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: commands }
        );
    } catch (error) {
        console.error(error);
    }
}
