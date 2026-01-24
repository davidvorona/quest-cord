import {
    ChatInputCommandInteraction,
    InteractionReplyOptions,
    EmbedBuilder,
    StringSelectMenuInteraction,
    InteractionUpdateOptions,
    TextChannel,
    InteractionEditReplyOptions,
    MessageFlags,
    MessagePayload,
    MessageCreateOptions
} from "discord.js";
import Encounter from "./encounters/Encounter";
import TextBuilder from "../text";
import { ACTIVITY } from "../constants";
import { CombatPosition } from "./encounters/combat/CombatPositionCache";
import CombatEncounter from "./encounters/combat/CombatEncounter";
import { sendTypingAndWaitRandom, delay, rand } from "../util";
import Creature from "./creatures/Creature";
import Character from "./creatures/Character";
import StealthEncounter from "./encounters/stealth/StealthEncounter";
import SocialEncounter from "./encounters/social/SocialEncounter";
import MerchantEncounter from "./encounters/merchant/MerchantEncounter";
import LookoutEncounter from "./encounters/lookout/LookoutEncounter";
import RestEncounter from "./encounters/rest/RestEncounter";
import FreeEncounter from "./encounters/FreeEncounter";
import Spell from "./things/Spell";
import { PollingMethod } from "./polls/Poll";
import { ButtonPressInteraction } from "../types";

/**
 * Each quest has a narrator, the thing responsible for crafting the messages
 * that describe what the players see and do. For now, it takes different
 * game objects and their state and finds appropriate text from a local
 * text bank. In the future, this will instead create a query to send to ChatGPT.
 */
class Narrator {
    static readonly TIME_TO_PONDER = 3000;

    guildId: string;

    channel: TextChannel;

    constructor(guildId: string, channel: TextChannel) {
        this.guildId = guildId;
        this.channel = channel;
    }

    async describe(payload: string | MessagePayload | MessageCreateOptions) {
        await this.channel.send(payload);
    }

    async ponderAndDescribe(payload: string | MessagePayload | MessageCreateOptions) {
        await sendTypingAndWaitRandom(this.channel, Narrator.TIME_TO_PONDER);
        await this.channel.send(payload);
    }

    async reply(
        interaction: ChatInputCommandInteraction
            | StringSelectMenuInteraction | ButtonPressInteraction,
        payload: string | InteractionReplyOptions
    ) {
        await interaction.reply(payload);
    }

    async ponderAndReply(
        interaction: ChatInputCommandInteraction
            | StringSelectMenuInteraction | ButtonPressInteraction,
        payload: string | InteractionEditReplyOptions,
        ephemeral = false
    ) {
        if (!interaction.deferred) {
            await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });
        }
        await delay(rand(Narrator.TIME_TO_PONDER));
        await interaction.editReply(payload);
    }

    async update(
        interaction: StringSelectMenuInteraction,
        payload: string| InteractionUpdateOptions
    ) {
        await interaction.update(payload);
    }

    async ponderAndUpdate(
        interaction: StringSelectMenuInteraction,
        payload: string | InteractionUpdateOptions
    ) {
        if (!interaction.deferred) {
            await interaction.deferUpdate();
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
    }

    async describeMovement(creature: Creature, position: CombatPosition) {
        const text = position === CombatPosition.Melee
            ? `${creature.getName()} moves into the fray.`
            : `${creature.getName()} moves out of the fray.`;
        await this.ponderAndDescribe(text);
    }

    async describeAttack(attacker: Creature, target: Creature, damage: number) {
        const textBuilder = new TextBuilder()
            .setActivity(ACTIVITY.ATTACK).setSubActivity("melee");
        const weapon = attacker.equipment.weapon;
        const weaponName = weapon ? weapon.name : attacker.getWeaponId();
        const text = textBuilder.build(weaponName, attacker.getName(), target.getName());
        await this.ponderAndDescribe(text);
        await this.ponderAndDescribe(`It deals ${damage} damage.`);
    }

    async describeCastSpell(attacker: Creature, spell: Spell, damage: number) {
        await this.ponderAndDescribe(`${attacker.getName()} casts ${spell.name} at `
            + `the enemy and deals ${damage} damage.`);
    }

    async explainEncounter(encounter: Encounter) {
        if (encounter instanceof CombatEncounter) {
            await this.ponderAndDescribe("On your turn, you can attack with the "
                + "**/action attack** command, or cast a spell with **/action spell**. "
                + "You can also use items with **/use**.\nBefore you act, you can decide "
                + "if you want to move with **/move**.");
        } else if (encounter instanceof StealthEncounter) {
            await this.ponderAndDescribe("Choose between a stealthy approach with the "
                + "**/action sneak** command, or surprise your enemies with **/action surprise**!");
        } else if (encounter instanceof SocialEncounter) {
            await this.ponderAndDescribe("Talk to the figure with the **/action talk** command, "
                + "or ignore them with **/action ignore**.");
        } else if (encounter instanceof MerchantEncounter) {
            await this.ponderAndDescribe("Trade with the merchant using the **/action buy** or "
                + "**/action sell** commands!");
        } else if (encounter instanceof LookoutEncounter) {
            await this.ponderAndDescribe("Take advantage of the view, and uncover more of the map "
                + "with the **/action lookout** command!");
        } else if (encounter instanceof RestEncounter) {
            await this.ponderAndDescribe("The days is yours! Rest, relax, and feel free to "
                + "check your character status with **/status**.");
        } else {
            await this.ponderAndDescribe("You can travel with the **/travel** command.");
        }
        if (encounter instanceof FreeEncounter) {
            await this.ponderAndDescribe("Whenever you're ready, use **/travel** to move on.");
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
            const embed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("Turn order")
                .setDescription(turnOrder);
            await this.ponderAndDescribe({ embeds: [embed] });
        } else if (encounter instanceof StealthEncounter) {
            await this.ponderAndDescribe("You peer forward and see a group of monsters. "
                + "They don't seem to see your party yet.");
        } else if (encounter instanceof SocialEncounter) {
            await this.ponderAndDescribe("Up ahead, you see a figure standing. They seem "
                + "friendly.");
        } else if (encounter instanceof MerchantEncounter) {
            await this.ponderAndDescribe("You've come across a merchant. Hooray for "
                + "mutually beneficial trade!");
        } else if (encounter instanceof LookoutEncounter) {
            await this.ponderAndDescribe("You find yourself at a vantage point, giving you "
                + "a great view of land around you.");
        } else if (encounter instanceof RestEncounter) {
            await this.ponderAndDescribe("You find yourself in a place of peace, sheltered from "
                + "bad weather and hidden from roaming monsters. A place to rest.");
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

    async describePollResults(method: PollingMethod) {
        if (method === PollingMethod.Random) {
            await this.describe("Poll result was a tie. QuestLord determining outcome...");
        } else {
            await this.describe(`Poll winner was determined by '${method}' vote.`);
        }
    }
}

export default Narrator;
