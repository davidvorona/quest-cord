import { Dungeon as DungeonType } from "../constants";
import { randInList } from "../util";

enum DungeonSize {
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

    getRoom(idx: number) {
        return this.rooms[idx];
    }

    clearRoom(idx: number) {
        this.rooms[idx] = 1;
    }

    isLastRoom(idx: number) {
        return idx === this.size - 1;
    }
}
