import path from "path";
import { createRandomId, rand, parseJson, readFile } from "../util";
import { BiomesJson, Biome, Direction } from "../types";
import { BIOME, DIRECTION, REGION_DIMENSION, WORLD_DIMENSION } from "../constants";
const biomesPath = path.join(__dirname, "../../config/biomes.json");
const biomesData = parseJson(readFile(biomesPath)) as BiomesJson;

function getRegionBiomes() {
    const biomes = Object.keys(biomesData);
    return biomes.filter(b => biomesData[b as Biome].region);
}

/**
 * Worlds are the spaces in which quests happen. There is only ever one world per server,
 * and some servers might share worlds. When a world is generated, regions are distributed
 * across the map, obeying rules unique to each region. Worlds are not intended to last
 * forever, and some mechanism must be developed for determining when a world ends. Worlds
 * should support multiple concurrent questing parties.
 */
class World {
    readonly id: string;

    readonly guildId: string;

    name: string;

    /**
     * The fault axis determines the direction that mountain ranges form. Faults on the
     * y-axis would generate north-south mountain ranges, whereas fault on the x-axis
     * would generate east-west mountain ranges. 
     */
    readonly faultAxis: number;

    matrix: Biome[][];

    constructor(guildId: string) {
        console.info("Generating new world...");
        this.id = createRandomId();
        this.name = "Discordia";

        this.guildId = guildId;

        this.faultAxis = World.randomizeFaultAxis();

        this.matrix = this.simpleGenerate();
        console.info(this.stringify());
    }

    private static isDepth(depth: number, x: number, y: number) {
        return x === depth  || y === depth || x === WORLD_DIMENSION - 1 - depth
            || y === WORLD_DIMENSION - 1 - depth;
    }

    private static isPerimeter(x: number, y: number) {
        return World.isDepth(0, x, y);
    }

    private static isSeedColumn(x: number) {
        return (x - 2) % REGION_DIMENSION === 0;
    }

    private static isRegionSeed(x: number, y: number) {
        return World.isSeedColumn(x) && (y - 2) % REGION_DIMENSION === 0;
    }

    /**
     * Quick but stupid method for generating a world of random dxd regions surrounded
     * by a beach and ocean layer.
     */
    private simpleGenerate() {
        const matrix = Array(WORLD_DIMENSION).fill(0).map(() => Array(WORLD_DIMENSION).fill(0));
        // We iterate through the world tiles by row, starting from the top and going left to right
        for (let y = 0; y < WORLD_DIMENSION; y++) {
            for (let x = 0; x < WORLD_DIMENSION; x++) {
                // The perimeter is always an endless ocean
                if (World.isPerimeter(x, y)) {
                    matrix[x][y] = BIOME.OCEAN;
                // One depth in from the ocean is a beach layer
                } else if (World.isDepth(1, x, y)) {
                    matrix[x][y] = BIOME.BEACH;
                // Random biome region generation relies on iteration order: if the coordinate is
                // the upper-left tile of a region, then set it to a random biome. This is the
                // "seed" of the region, and must be set first per region for generation to
                // function.
                } else if (World.isRegionSeed(x, y)) {
                    const biomes = getRegionBiomes();
                    matrix[x][y] = biomes[rand(biomes.length)];
                /**
                 * Because of the iteration order, biomes will generate outward from the "seed":
                 * | 1 2 3 |
                 * | 4 5 6 |
                 * | 7 8 9 |
                 * where '1' is the seed tile.
                 */
                // If x is a seed coordinate but y is not, then get the biome from the tile
                // above (y - 1).
                } else if (World.isSeedColumn(x)) {
                    matrix[x][y] = matrix[x][y - 1];
                // Otherwise, use the biome of the tile to the left (x - 1).
                } else {
                    matrix[x][y] = matrix[x - 1][y];
                }
            }
        }
        return matrix;
    }

    /**
     * Returns random coordinates in the world as an [x, y] tuple.
     */
    getRandomCoordinates(): [number, number] {
        return [rand(WORLD_DIMENSION), rand(WORLD_DIMENSION)];
    }

    getBiome(coordinates: [number, number]): Biome {
        return this.matrix[coordinates[0]][coordinates[1]];
    }

    applyDirectionToCoordinates(
        direction: Direction,
        coordinates: [number, number]
    ): [number, number] {
        let x = coordinates[0];
        let y = coordinates[1];
        if (direction === DIRECTION.NORTH) {
            y -= 1;
        } else if (direction === DIRECTION.SOUTH) {
            y += 1;
        } else if (direction === DIRECTION.EAST) {
            x += 1;
        } else if (direction === DIRECTION.WEST) {
            x -= 1;
        }
        if (x < 0 || x > WORLD_DIMENSION - 1 || y < 0 || y > WORLD_DIMENSION - 1) {
            throw new Error(`(${x},${y}) are invalid coordinates`);
        }
        return [x, y];
    }

    /**
     * Bit of 0 indicates the fault axis is vertical, 1 indicates it's horizontal.
     */
    private static randomizeFaultAxis() {
        return rand(3) === 0 ? 1 : 0;
    }

    private isNormalFaultAxis() {
        return !this.faultAxis;
    }

    // TODO: Improve this function to actually work correctly
    private randomizePerimeterTile(previousTile: string, x: number, y: number) {
        let biome: Biome = BIOME.OCEAN;
        if (this.isNormalFaultAxis() && (x === 0 || x === WORLD_DIMENSION - 1)) {
            if (previousTile === BIOME.MOUNTAINS) {
                biome = rand(5) === 0 ? BIOME.OCEAN : BIOME.MOUNTAINS;
            } else if (rand(5) === 0) {
                biome = BIOME.MOUNTAINS;
            }
        } else if (!this.isNormalFaultAxis() && (y === 0 || y === WORLD_DIMENSION - 1)) {
            if (previousTile === BIOME.MOUNTAINS) {
                biome = rand(5) === 0 ? BIOME.OCEAN : BIOME.MOUNTAINS;
            } else if (rand(5) === 0) {
                biome = BIOME.MOUNTAINS;
            }
        }
        return biome;
    }

    /**
     * Slower method of generating a world, uses rules to generate a more natural distribution
     * of regions.
     */
    private smartGenerate() {
        const matrix = Array(WORLD_DIMENSION)
            .fill("forest")
            .map(() => Array(WORLD_DIMENSION).fill("forest"));
        // 1. Generate the perimeter of the world: mostly oceans and some mountains
        for (let d = 0; d < WORLD_DIMENSION; d++) {
            // Generate tiles along the x-axis at y = 0
            let previousTile = d > 0 ? matrix[d - 1][0] : null;
            matrix[d][0] = this.randomizePerimeterTile(previousTile, d, 0);
            // Generate tiles along the y-axis at x = 0
            previousTile = d > 0 ? matrix[0][d - 1] : null;
            matrix[0][d] = this.randomizePerimeterTile(previousTile, 0, d);
            const last = WORLD_DIMENSION - 1;
            // Generate tiles along the x-axis at y = WORLD_DIMENSION
            previousTile = d > 0 ? matrix[last - d + 1][last] : null;
            matrix[last - d][last] = this.randomizePerimeterTile(previousTile, last - d, last);
            // Generate tiles along the y-axis at x = WORLD_DIMENSION
            previousTile = d > 0 ? matrix[last][last - d + 1] : null;
            matrix[last][last - d] = this.randomizePerimeterTile(previousTile, last, last - d);
        }
        // 2. Generate mountains within the world along fault axis
        // 3. Generate rivers from mountains that end at perimeter
        // 4. Generate biomes around the mountains within the world
        // 5. Fill in remaining space with appropriate biomes
        // 6. Add lakes and other non-biome tiles to biomes
        return matrix;
    }

    stringify(partyCoordinates?: [number, number]) {
        let worldStr = "";
        this.matrix.forEach((row, y) => {
            row.forEach((biome, x) => {
                if (partyCoordinates && x === partyCoordinates[0] && y === partyCoordinates[1]) {
                    worldStr += "🧑";
                } else {
                    worldStr += biomesData[biome as Biome].emoji;
                }
            });
            if (y !== this.matrix.length - 1) {
                worldStr += "\n";
            }
        });
        return worldStr;
    }
}

export default World;
