import {
    MessageEmbed,
    TextBasedChannel,
    MessageOptions,
    CommandInteraction,
    InteractionReplyOptions
} from "discord.js";
import Encounter from "./Encounter";
import TextBuilder from "../text";
import { ACTIVITY } from "../constants";
import CombatEncounter from "./CombatEncounter";
import { sendTypingAndWaitRandom, delay, rand } from "../util";
import Creature from "./Creature";
import Character from "./Character";
import StealthEncounter from "./StealthEncounter";

/**
 * Each quest has a narrator, the thing responsible for crafting the messages
 * that describe what the players see and do. For now, it takes different
 * game objects and their state and finds appropriate text from a local
 * text bank. In the future, this will instead create a query to send to ChatGPT.
 */
class Narrator {
    static readonly TIME_TO_PONDER = 3000;

    guildId: string;

    channel: TextBasedChannel;

    constructor(guildId: string, channel: TextBasedChannel) {
        this.guildId = guildId;
        this.channel = channel;
    }

    async ponderAndDescribe(payload: string | MessageOptions) {
        await sendTypingAndWaitRandom(this.channel, Narrator.TIME_TO_PONDER);
        await this.channel.send(payload);
    }

    async ponderAndReply(
        interaction: CommandInteraction,
        payload: string | InteractionReplyOptions
    ) {
        const ephemeral = typeof payload !== "string" ? payload.ephemeral : false;
        if (!interaction.deferred) {
            await interaction.deferReply({ ephemeral });
        }
        await delay(rand(Narrator.TIME_TO_PONDER));
        await interaction.editReply(payload);
    }

    async describeNewParty(party: Character[]) {
        const text1 = "You wake up and find yourself in a strange land...";
        await this.ponderAndDescribe(text1);
        const text2 = party.length > 1
            ? `By your side are ${party.length - 1} other adventurers...`
            : "You find yourself in this land alone...";
        await this.ponderAndDescribe(text2);
        if (party.length > 1) {
            let text3 = "";
            party.forEach((c, idx) => {
                if (idx === party.length - 1) {
                    text3 += `and **${c.baseId}** *${c.name}*...`;
                } else {
                    text3 += `**${c.baseId}** *${c.name}*, `;
                }
            });
            await this.ponderAndDescribe(text3);
        }
        await this.ponderAndDescribe("Welcome to *Discordia*!");
    }

    async describeAttack(attacker: Creature, target: Creature, damage: number) {
        const textBuilder = new TextBuilder()
            .setActivity(ACTIVITY.ATTACK).setSubActivity("melee");
        const weapon = attacker.equipment.weapon;
        const weaponName = weapon ? weapon.name : "fists";
        const text = textBuilder.build(weaponName, target.getName());
        await this.ponderAndDescribe(text);
        await this.ponderAndDescribe(`You deal ${damage} damage.`);
    }

    async describeCastSpell(attacker: Creature, spell: string) {
        await this.ponderAndDescribe(`${attacker.getName()} casts ${spell} at `
            + "the enemy and deals 0 damage.");
    }

    async explainEncounter(encounter: Encounter) {
        if (encounter instanceof CombatEncounter) {
            await this.ponderAndDescribe("On your turn, you can act with the **/action** command. "
                + "You can also use items with **/use**.");
        } else if (encounter instanceof StealthEncounter) {
            await this.ponderAndDescribe("Choose between a stealthy approach with the **/sneak** "
                + "command, or surprise your enemies with **/surprise**!");
        } else {
            await this.ponderAndDescribe("You can travel with the **/travel** command.");
        }
    }

    async describeEncounter(encounter: Encounter) {
        if (encounter instanceof CombatEncounter) {
            // Get names of monsters in encounter
            const monsterNames = encounter.getMonsterNames();
            const textBuilder = new TextBuilder()
                .setActivity(ACTIVITY.ENCOUNTER).setSubActivity("start");
            await this.ponderAndDescribe(textBuilder.build(monsterNames));
            // Send an embed of the turn order
            const turnOrder = encounter.getTurnOrderNames()
                .reduce((acc, curr, idx) => `${acc}\n**${idx + 1}.** ${curr}`, "");
            const embed = new MessageEmbed()
                .setColor("#0099ff")
                .setTitle("Turn order")
                .setDescription(turnOrder);
            await this.ponderAndDescribe({ embeds: [embed] });
        } else if (encounter instanceof StealthEncounter) {
            await this.ponderAndDescribe("You peer forward and see a group of monsters. "
                + "They don't seem to see your party yet.");
        } else {
            await this.ponderAndDescribe("Woah! You run into the craziest encounter!");
        }
    }

    async describeEncounterOver(encounter: Encounter) {
        if (encounter instanceof CombatEncounter) {
            await this.ponderAndDescribe("Combat is over!");
            const isTpk = !encounter.getTotalCharacterHp();
            const text = isTpk
                ? "Your party lies dead and dying at the feet of your foes."
                : "The enemies lie dead at your feet...victory!";
            await this.ponderAndDescribe(text);
        }
    }

    async describeTravel(oldBiome: string, newBiome: string) {
        const newBiomeSentence = oldBiome === newBiome
            ? `You make your way further into the ${newBiome}.`
            : `You find yourself in the ${newBiome}.`;
        let description = "";
        switch (newBiome) {
        case "forest":
            description = "The trees are green and critters run between their roots.";
            break;
        case "desert":
            description = "The sun beats down on your back as you traverse sand dunes.";
            break;
        case "mountains":
            description = "The path is steep and treacherous, the great peaks high above you "
                + "still.";
            break;
        case "jungle":
            description = "Jungle vines tug at your ankles as you hack your way through the "
                + "thick foliage.";
            break;
        case "beach":
            description = "The sand feels good between your toes, a vast and endless ocean "
                + "in front of you.";
            break;
        case "ocean":
            description = "Oh dear, you're swimming for dear life!";
            break;
        default:
            break;
        }
        await this.ponderAndDescribe(`${newBiomeSentence} ${description}`);
    }

    async describeSurroundings(biome: string) {
        await this.ponderAndDescribe("You take stock of your surroundings - currently you're "
            + `in the ${biome}.`);
    }
}

export default Narrator;
