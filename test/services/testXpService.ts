import assert from "assert";
import XpService from "../../src/services/XpService";

describe("testXpService", () => {
    let xpService: XpService;

    const xpTestData = {
        1: 0,
        2: 50,
        3: 162,
        9: 3879,
        10: 5296
    };

    beforeEach(() => {
        xpService = new XpService();
    });

    it("should get total XP from level 1 for a level", () => {
        let xp = xpService.getExperienceForLevel(1);
        assert.strictEqual(xp, xpTestData[1]);
        xp = xpService.getExperienceForLevel(2);
        assert.strictEqual(xp, xpTestData[2]);
        xp = xpService.getExperienceForLevel(3);
        assert.strictEqual(xp, xpTestData[3]);
        xp = xpService.getExperienceForLevel(10);
        assert.strictEqual(xp, xpTestData[10]);
    });

    it("should get XP to get from current level to next level", () => {
        let xp = xpService.getExperienceForNextLevel(1);
        assert.strictEqual(xp, xpTestData[2] - xpTestData[1]);
        xp = xpService.getExperienceForNextLevel(9);
        assert.strictEqual(xp, xpTestData[10] - xpTestData[9]);
    });
});
