import { Dungeon as DungeonType } from "../constants";
import { randInList } from "../util";

export enum DungeonSize {
    Short = 3,
    Medium = 5,
    Long = 7
};

export default class Dungeon {
    type: DungeonType;

    size: DungeonSize;

    rooms: number[];

    static getSizeText(size: DungeonSize) {
        return Object.keys(DungeonSize).find(key =>
            DungeonSize[key as keyof typeof DungeonSize] === size) as keyof typeof DungeonSize;
    }

    constructor(dungeonType: DungeonType) {
        this.type = dungeonType;
        this.size = randInList([DungeonSize.Short, DungeonSize.Medium, DungeonSize.Long]);
        this.rooms = new Array(this.size).fill(0);
    }

    getCurrentIdx = () => this.rooms.findIndex(val => val === 0);

    nextRoom() {
        this.rooms[this.getCurrentIdx()] = 1;
    }

    isFirstRoom() {
        return this.getCurrentIdx() === 0;
    }

    isLastRoom() {
        return this.getCurrentIdx() === this.size - 1;
    }
}
