import * as fs from "fs";
import path from "path";
import crypto from "crypto";
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    PermissionsBitField,
    TextBasedChannel
} from "discord.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isEmpty = (thing: any) =>
    thing === null || thing === undefined
    || (typeof thing === "string" && !thing)
    || (Array.isArray(thing) && !thing.length)
    || typeof thing === "object" && !Object.keys(thing).length;

/**
 * Reads the file at the provided file path and returns stringified data.
 */
export const readFile = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

export const readDir = (filePath: string): string[] => fs.readdirSync(filePath);

/**
 * Parses the stringified data to a JSON object and logs any exceptions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseJson = (dataJson: string): any => {
    try {
        return JSON.parse(dataJson);
    } catch (err) {
        console.error(`Failed to read JSON ${dataJson}`);
        throw err;
    }
};

/**
 * Finds a random number between 0 and the provided max, exclusive.
 * Example: rand(3) => 0 or 1 or 2
 */
export const rand = (max: number) => Math.floor(Math.random() * Math.floor(max));

/**
 * Returns a random element from the given list.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const randInList = (list: unknown[]) => {
    return list[rand(list.length)];
};

/**
 * Returns a random key in an object.
 */
export const randKey = (object: Record<string, unknown>) => {
    return Object.keys(object)[rand(Object.keys(object).length)];
};

/**
 * Creates a random UUID using the crypto package.
 */
export const createRandomId = () => crypto.randomUUID();

/**
 * Loads first/last names from the .txt files.
 */
export const loadNames = () => {
    const firstNamesPath = path.join(__dirname, "../config/first-names.txt");
    const firstNames = readFile(firstNamesPath).trim().split("\n");
    const lastNamesPath = path.join(__dirname, "../config/last-names.txt");
    const lastNames = readFile(lastNamesPath).trim().split("\n");
    return { firstNames, lastNames };
};

/**
 * Extracts guild members from the /start command options.
 */
export const getPlayersFromStartCommand = (interaction: ChatInputCommandInteraction) => {
    const players = [];
    const getPlayer = (player: string) => interaction.options.getMentionable(player);
    players.push(interaction.options.getMentionable("player1"));
    if (getPlayer("player2")) {
        players.push(getPlayer("player2"));
    }
    if (getPlayer("player3")) {
        players.push(getPlayer("player3"));
    }
    if (getPlayer("player4")) {
        players.push(getPlayer("player4"));
    }
    if (getPlayer("player5")) {
        players.push(getPlayer("player5"));
    }
    return players as GuildMember[];
};

/**
 * Takes a map of PermissionBitFields keyed to a string identifier, such
 * as a user ID, and creates a readable message to send as a reply.
 * Example:
 * Cowberry5 is missing permissions: SendMessages
 */
export const sendMissingPermissionsMessage = async (
    interaction: ChatInputCommandInteraction,
    errors: Record<string, PermissionsBitField>
) => {
    const permissionsMessage = Object.keys(errors)
        .reduce((acc, username) => acc +=
            `**${username}** is missing permissions: **${errors[username].toArray()}**\n`,
        "");
    const embed = new EmbedBuilder()
        .setDescription(`It looks like you have some permissions issues.\n\n${permissionsMessage}`);
    await interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const shuffleArray = (array: any[]) => array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendTypingAndWait = async (channel: TextBasedChannel, ms: number) => {
    await channel.sendTyping();
    await delay(ms);
};

export const sendTypingAndWaitRandom = async (channel: TextBasedChannel, ms: number) => {
    await sendTypingAndWait(channel, rand(ms));
};
