import fs from "fs";
import path from "path";
import { AnyObject, CharacterClass } from "../types";
import { parseJson, rand, readFile } from "../util";
import { COMPENDIUM_SECTION } from "../constants";
import CompendiumFactory from "./factory";

class Compendium {
    data: Record<string, AnyObject> = {};

    factory = new CompendiumFactory();

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

    spawn(section: string, key: string): AnyObject {
        const data = this.data[section][key];
        const instance = this.factory.create(section, data);
        return instance;
    }

    spawnRandom(section: string): AnyObject {
        const instance = this.factory.create(section, this.pickRandom(section));
        return instance;
    }

    spawnCharacterClass(key?: string): CharacterClass {
        const section = COMPENDIUM_SECTION.CLASSES;
        if (!key) {
            return this.spawnRandom(section) as CharacterClass;
        }
        const data = this.data[section][key];
        return (data ? this.spawn(section, key) : this.spawnRandom(section)) as CharacterClass;
    }
}

const compendium = new Compendium();
compendium.load();

export default compendium;
