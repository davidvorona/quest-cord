import { Routes, REST, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { CharacterClass } from "./types";
import { DIRECTION, FORMATTED_DIRECTION } from "./constants";
import { defaultCompendiumReader as compendium } from "./services/CompendiumReader";
import Encounters from "./game/encounters";
import config from "./config";

const { clientId, authToken } = config;

const rest = new REST({ version: "10" }).setToken(authToken);

interface CommandBuilderArgs {
    type: number;
    targets?: string[];
}

class CommandBuilder {
    type?: number;

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

    private buildActionSubcommands(builder: SlashCommandBuilder) {
        const commands: { name: string; description: string; }[] = [];
        Encounters.forEach((Encounter) => {
            Encounter.commands.forEach((command) => {
                const exists = commands.find(c => c.name === command.name);
                if (exists) {
                    console.warn("Duplicate command:", command.name);
                    return;
                }
                commands.push(command);
            });
        });
        commands.forEach((command) => {
            builder.addSubcommand((subcommand) => {
                return subcommand
                    .setName(command.name)
                    .setDescription(command.description);
            });
        });
        return builder;
    }

    build() {
        return [
            // /ping
            new SlashCommandBuilder()
                .setName("ping")
                .setDescription("Replies with pong!")
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            // /start
            new SlashCommandBuilder()
                .setName("start")
                .setDescription("Start a quest for a party")
                .addChannelOption((option) => {
                    return option
                        .setName("channel")
                        .setDescription("Pick a channel for this quest")
                        .setRequired(true);
                })
                .addMentionableOption((option) => {
                    return option
                        .setName("player1")
                        .setDescription("Player 1")
                        .setRequired(true);
                })
                .addMentionableOption((option) => {
                    return option
                        .setName("player2")
                        .setDescription("Player 2");
                })
                .addMentionableOption((option) => {
                    return option
                        .setName("player3")
                        .setDescription("Player 3");
                })
                .addMentionableOption((option) => {
                    return option
                        .setName("player4")
                        .setDescription("Player 4");
                })
                .addMentionableOption((option) => {
                    return option
                        .setName("player5")
                        .setDescription("Player 5");
                })
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            // /play
            new SlashCommandBuilder()
                .setName("play")
                .setDescription("Create a character and embark on a quest")
                .addStringOption((option) => {
                    return option
                        .setName("class")
                        .setDescription("Pick a character class")
                        .setRequired(true)
                        .addChoices(...Object.values(compendium.data.classes).map(
                            (c: CharacterClass) => this.buildStringChoices(c.name, c.id)
                        ));
                }),
            // /inventory
            new SlashCommandBuilder()
                .setName("inventory")
                .setDescription("Show your current inventory"),
            // /status
            new SlashCommandBuilder()
                .setName("status")
                .setDescription("Show your character's current status"),
            // /map
            new SlashCommandBuilder()
                .setName("map")
                .setDescription("Display the map"),
            // /travel
            new SlashCommandBuilder()
                .setName("travel")
                .setDescription("What direction will you travel next?")
                .addStringOption((option) => {
                    return option
                        .setName("direction")
                        .setDescription("Pick the compass direction")
                        .setRequired(true)
                        .addChoices(
                            { name: FORMATTED_DIRECTION.NORTH, value: DIRECTION.NORTH },
                            { name: FORMATTED_DIRECTION.SOUTH, value: DIRECTION.SOUTH },
                            { name: FORMATTED_DIRECTION.EAST, value: DIRECTION.EAST },
                            { name: FORMATTED_DIRECTION.WEST, value: DIRECTION.WEST },
                        );
                }),
            // /use - Use an item, behavior depends on encounter state
            new SlashCommandBuilder()
                .setName("use")
                .setDescription("Use an item from your inventory"),
            // /action - Used for encounter-specific subcommands
            this.buildActionSubcommands(
                new SlashCommandBuilder()
                    .setName("action")
                    .setDescription("What do you want to do?")
            ),
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
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );
    } catch (error) {
        console.error(error);
    }
}
