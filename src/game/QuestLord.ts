import { CommandInteraction, Interaction, TextChannel } from "discord.js";
import setGuildCommands from "../commands";
import { ACTIVITY, COMMAND_TYPE } from "../constants";
import TextBuilder from "../text";
import Encounter from "./Encounter";
import Quest from "./Quest";

export default class QuestLord {
    quests: Record<string, Quest> = {};

    constructor() {
        console.info("Summoning the Quest Lord...");
    }

    assertQuestStarted(guildId: string) {
        if (!this.quests[guildId]) {
            throw new Error("Quest not started, aborting");
        }
    }

    assertQuestNotStarted(guildId: string) {
        if (this.quests[guildId]) {
            throw new Error("Quest already started, aborting");
        }
    }

    async handleInteraction(interaction: Interaction) {
        if (!interaction.isCommand()) return;

        if (interaction.commandName === "ping") {
            await interaction.reply("pong!");
        }

        if (!interaction.guildId) return;
    
        if (interaction.commandName === "play") {
            await this.startQuest(interaction);
        }

        if (interaction.commandName === "attack") {
            await this.handleAttack(interaction);
        }
    }

    async startQuest(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestNotStarted(guildId);
    
        await interaction.reply({ 
            content: "Adventure calls you...",
            ephemeral: true
        });

        const userId = interaction.user.id;

        // Create quest for user(s)
        const quest = new Quest(guildId);
        quest.addPlayer(userId);

        // Register new quest
        this.quests[guildId] = quest;

        // Start with basic encounter
        const textChannel = interaction.channel as TextChannel;
        this.startEncounter(guildId, textChannel, quest);
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
        const pc = quest.getPlayerByUserId(interaction.user.id);

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
