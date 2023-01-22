import fs from "fs";
import path from "path";
import { AnyObject } from "../types";
import { parseJson, rand, readFile } from "../util";

class CompendiumReader {
    data: Record<string, AnyObject> = {};

    load() {
        const compendiumPath = path.join(__dirname, "../../compendium");
        const dir = fs.readdirSync(compendiumPath);
        dir.forEach((d) => {
            const sectionPath = path.join(compendiumPath, d);
            const files = fs.readdirSync(sectionPath);
            this.section(d);
            files.forEach((f) => {
                const data = parseJson(readFile(path.join(sectionPath, f)));
                this.set(d, data.id, data);
            });
        });
        console.info("Loaded compendium:", this.data);
    }

    private section(key: string): void {
        this.data[key] = {};
    }

    private set(section: string, key: string, value: Record<string, AnyObject>): void {
        this.data[section][key] = value;
    }

    read(section: string, key?: string) {
        const data = this.data[section];
        if (!key) {
            return data;
        }
        return data[key];
    }

    random(section: string) {
        const sectionData: AnyObject = this.data[section];
        const key = Object.keys(sectionData)[rand(Object.keys(sectionData).length)];
        return sectionData[key];
    }

    randomList(section: string, length: number): AnyObject[] {
        const list = [];
        for (let i = 0; i < length; i++) {
            list.push(this.random(section));
        }
        return list;
    }
}

export const defaultCompendiumReader = new CompendiumReader();
defaultCompendiumReader.load();

export default CompendiumReader;
