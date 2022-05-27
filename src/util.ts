import * as fs from "fs";
import path from "path";
import crypto from "crypto";
import { MonsterData } from "./types";
import Monster from "./game/Monster";

/**
 * Reads the file at the provided file path and returns stringified data.
 * 
 * @param {string} filePath relative path to the file
 * @returns {string} stringified data from file
 */
export const readFile = (filePath: string): string => fs.readFileSync(filePath, "utf-8");

/**
 * Parses the stringified data to a JSON object and logs any exceptions.
 * 
 * @param {string} dataJson 
 * @returns 
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
 * 
 * @param {number} max 
 * @returns 
 */
export const rand = (max: number) => Math.floor(Math.random() * Math.floor(max));

export const createRandomId = () => crypto.randomUUID();

export const loadNames = () => {
    const firstNamesPath = path.join(__dirname, "../config/first-names.txt");
    const firstNames = readFile(firstNamesPath).trim().split("\n");
    const lastNamesPath = path.join(__dirname, "../config/last-names.txt");
    const lastNames = readFile(lastNamesPath).trim().split("\n");
    return { firstNames, lastNames };
};

export const listToMonster = (data: MonsterData[]): Monster[] => data.map(m => new Monster(m));
