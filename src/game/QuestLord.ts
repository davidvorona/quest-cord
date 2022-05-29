import { CommandInteraction, Interaction, TextChannel } from "discord.js";
import setGuildCommands from "../commands";
import { ACTIVITY, COMMAND_TYPE } from "../constants";
import TextBuilder from "../text";
import { getPlayersFromStartCommand, isEmpty } from "../util";
import Encounter from "./Encounter";
import PlayerCharacter from "./PlayerCharacter";
import Quest from "./Quest";

export default class QuestLord {
    quests: Record<string, Quest> = {};

    constructor() {
        console.info("Summoning the Quest Lord...");
    }

    assertQuestStarted(guildId: string) {
        if (isEmpty(this.quests[guildId])) {
            throw new Error("Quest not started, aborting");
        }
    }

    assertQuestNotStarted(guildId: string) {
        if (!isEmpty(this.quests[guildId])) {
            throw new Error("Quest already started, aborting");
        }
    }

    async handleInteraction(interaction: Interaction) {
        if (!interaction.isCommand()) return;

        if (interaction.commandName === "ping") {
            await interaction.reply("pong!");
        }

        if (!interaction.guildId) return;

        // Mod manually starts a quest for users
        if (interaction.commandName === "start") {
            await this.startQuest(interaction);
        }

        // Users create characters to join quest
        if (interaction.commandName === "play") {
            await this.createCharacter(interaction);
        }

        // Users attack during a combat encounter
        if (interaction.commandName === "attack") {
            await this.handleAttack(interaction);
        }
    }

    async startQuest(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestNotStarted(guildId);

        // Create quest for user(s)
        const quest = new Quest(guildId);
        const players = getPlayersFromStartCommand(interaction);
        players.forEach(p => quest.addPlayer(p.id));

        // Register new quest
        this.quests[guildId] = quest;

        // Register guild commands for character creation
        await setGuildCommands(guildId, { type: COMMAND_TYPE.NEW_QUEST });

        await interaction.reply({
            content: `Quest created for **${players.length}** players...`,
            ephemeral: true
        });

        // Invite players to create characters and join the quest
        if (interaction.channel) {
            await interaction.channel.send(
                `${players.join(" ")} Adventure calls you, **/play** to journey to *Discordia*...`
            );
        }
    }

    async createCharacter(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId] as Quest;
        const userId = interaction.user.id;
        if (!quest.isUserInParty(userId)) {
            await interaction.reply({
                content: "Destiny has not claimed you yet, your time will come...",
                ephemeral: true
            });
        } else if (quest.isCharacterCreated(userId)) {
            await interaction.reply({
                content: "You already have a character in the questing party.",
                ephemeral: true
            });
        } else {
            const classId = interaction.options.getString("class") as string;
            const pc = quest.createCharacter(userId, classId);
            await interaction.reply({
                content: `Character *${pc.getName()}*, level ${pc.state.lvl} ${classId}, created...`,
                ephemeral: true
            });
        }

        if (quest.areAllCharactersCreated()) {
            await setGuildCommands(guildId);
            const textChannel = interaction.channel as TextChannel;
            await this.startEncounter(guildId, textChannel, quest);
        }
    }

    async startEncounter(guildId: string, channel: TextChannel, quest: Quest) {
        quest.startEncounter();

        // Get encounter data
        const encounter = quest.getEncounter() as Encounter;
        const monsterNames = encounter.getMonsterNames();

        // Send text for the first encounter
        const textBuilder = new TextBuilder().setActivity(ACTIVITY.ENCOUNTER).setSubActivity("start");
        const text = textBuilder.build(monsterNames);
        await channel.send(text);

        // Register guild commands for encounter
        await setGuildCommands(guildId, {
            type: COMMAND_TYPE.ENCOUNTER,
            targets: monsterNames
        });
    }

    async handleAttack(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId] as Quest;
        quest.assertEncounterStarted();

        const encounter = quest.encounter as Encounter;
        const targetIdx = interaction.options.getInteger("target") as number;

        const target = encounter.getMonsterByIndex(targetIdx);
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;

        const damage = pc.state.damage;
        target.setHp(target.state.hp - damage);

        const textBuilder = new TextBuilder().setActivity(ACTIVITY.ATTACK).setSubActivity("melee");
        const weapon = pc.state.weapons[0];
        const text = textBuilder.build(weapon, target.state.name);
        await interaction.reply(text);
        if (interaction.channel) {
            await interaction.channel.send(`You deal ${pc.state.damage} damage.`);
        }
    }
}
