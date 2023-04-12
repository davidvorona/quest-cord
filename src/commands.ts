import { Routes, REST, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { CharacterClass } from "./types";
import { DIRECTION, FORMATTED_DIRECTION } from "./constants";
import { defaultCompendiumReader as compendium } from "./services/CompendiumReader";
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

    build() {
        const classChoices = Object.values(compendium.data.classes).map(
            (c: CharacterClass) => this.buildStringChoices(c.name, c.id)
        );
        const directionChoices = [
            { name: FORMATTED_DIRECTION.NORTH, value: DIRECTION.NORTH },
            { name: FORMATTED_DIRECTION.SOUTH, value: DIRECTION.SOUTH },
            { name: FORMATTED_DIRECTION.EAST, value: DIRECTION.EAST },
            { name: FORMATTED_DIRECTION.WEST, value: DIRECTION.WEST },
        ];
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
                        .addChoices(...classChoices);
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
                        .addChoices(...directionChoices);
                }),
            // /action
            new SlashCommandBuilder()
                .setName("action")
                .setDescription("What do you want to do?")
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("use")
                        .setDescription("Use an item in your inventory");
                })
                // /action attack
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("attack")
                        .setDescription("Strike at an enemy!");
                })
                // /action cast
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("cast")
                        .setDescription("Cast a spell");
                })
                // /action sneak
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("sneak")
                        .setDescription("Try to sneak past the enemies");
                })
                // /action surprise
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("surprise")
                        .setDescription("Surprise the enemies and attack!");
                })
                // /action talk
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("talk")
                        .setDescription("Beg, bully, or bandy your way forward");
                })
                // /action buy
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("buy")
                        .setDescription("Buy items from the merchant's stock");
                })
                // /action sell
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("sell")
                        .setDescription("Sell items to the merchant");
                })
                // /action lookout
                .addSubcommand((subcommand) => {
                    return subcommand
                        .setName("lookout")
                        .setDescription("Take in your surroundings from a vantage point");
                })
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
