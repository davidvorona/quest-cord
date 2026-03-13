import { Dungeon as DungeonType } from "../constants";
import { randInList } from "../util";

enum DungeonSize {
    Small = 3,
    Medium = 5,
    Large = 7
};

const sizes = new Set(Object.values(DungeonSize)) as Set<DungeonSize>;

export default class Dungeon {
    type: DungeonType;

    size: DungeonSize;

    rooms: number[];

    constructor(dungeonType: DungeonType) {
        this.type = dungeonType;
        this.size = randInList(Object.values(sizes));
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
