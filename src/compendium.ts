import fs from "fs";
import path from "path";
import { AnyObject } from "./types";
import { parseJson, readFile } from "./util";

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
                this.set(d, data.name, data);
            });
        });
    }

    section(key: string): void {
        this.data[key] = {};
    }

    set(section: string, key: string, value: Record<string, AnyObject>): void {
        this.data[section][key] = value;
    }
}

const compendium = new Compendium();
compendium.load();
console.info("Loaded compendium:", compendium);

export default compendium;
