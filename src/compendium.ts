import fs from "fs";
import path from "path";
import { AnyObject } from "./types";
import { parseJson, rand, readFile } from "./util";

class Compendium {
    data: Record<string, AnyObject> = {};

    load() {
        const compendiumPath = path.join(__dirname, "../compendium");
        const dir = fs.readdirSync(compendiumPath);
        dir.forEach((d) => {
            const sectionPath = path.join(compendiumPath, d);
            const files = fs.readdirSync(sectionPath);
            this.section(d);
            files.forEach((f) => {
                const data = parseJson(readFile(path.join(sectionPath, f)));
                this.set(d, data.name.toLowerCase(), data);
            });
        });
        console.info("Loaded compendium:", this.data);
    }

    section(key: string): void {
        this.data[key] = {};
    }

    set(section: string, key: string, value: Record<string, AnyObject>): void {
        this.data[section][key] = value;
    }

    pickRandom(section: string): AnyObject {
        const sectionData: AnyObject = this.data[section];
        const key = Object.keys(sectionData)[rand(Object.keys(sectionData).length)];
        return sectionData[key];
    }

    pickRandomList(section: string, length: number): AnyObject[] {
        const list = [];
        for (let i = 0; i < length; i++) {
            list.push(this.pickRandom(section));
        }
        return list;
    }
}

const compendium = new Compendium();
compendium.load();

export default compendium;
