import path from "path";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import { ConfigJson, AuthJson, AnyObject } from "./types";
import { parseJson, readFile } from "./util";
import { COMMAND_TYPE } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultCommands = require("../config/commands");
const authPath = path.join(__dirname, "../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;
const configPath = path.join(__dirname, "../config/config.json");
const { CLIENT_ID } = parseJson(readFile(configPath)) as ConfigJson;

const rest = new REST({ version: "9" }).setToken(TOKEN);

interface CommandBuilderArgs {
    type: string;
    targets?: string[]
}

class CommandBuilder {
    type: string;

    targets?: string[];

    constructor(args: CommandBuilderArgs) {
        this.type = args.type;
        if (args.targets) {
            this.targets = args.targets;
        }
    }

    private buildChoices(name: string, value: string) {
        return {
            name,
            value
        };
    }

    build(): AnyObject[] {
        const builtCommands = [];
        switch (this.type) {
        case COMMAND_TYPE.ENCOUNTER: {
            const targets = this.targets as string[];
            const choices = targets.map((t, idx) => {
                const targetDescription = `${t} ${idx + 1}`;
                return this.buildChoices(targetDescription, idx.toString());
            });
            builtCommands.push(new SlashCommandBuilder()
                .setName("attack")
                .setDescription("Strike at an enemy!")
                .addStringOption((option) => {
                    return option
                        .setName("target")
                        .setDescription("Who do you want to attack?")
                        .setRequired(true)
                        .addChoices(...choices);
                })
                .toJSON());
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

export default async function setGuildCommands(guildId: string, args: CommandBuilderArgs) {
    const builder = new CommandBuilder(args);
    const commands = builder.build();
    try {
        console.log(`Started refreshing guild (/) commands for '${args.type}'.`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: commands }
        );
        console.log("Successfully reloaded guild (/) commands.");
    } catch (error) {
        console.error(error);
    }
}
