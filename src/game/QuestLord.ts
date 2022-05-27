import { CommandInteraction, Interaction, TextChannel } from "discord.js";
import setGuildCommands from "../commands";
import { ACTIVITY, COMMAND_TYPE } from "../constants";
import TextBuilder from "../text";
import Encounter from "./Encounter";
import Quest from "./Quest";

export default class QuestLord {
    quests: Quest[] = [];

    constructor() {
        console.info("Summoning the Quest Lord...");
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
        await interaction.reply({ 
            content: "Adventure calls you...",
            ephemeral: true
        });

        const guildId = interaction.guildId as string;
        const userId = interaction.user.id;

        // Create quest for user(s)
        const quest = new Quest(guildId);
        quest.addPlayer(userId);

        // Register new quest
        this.quests.push(quest);

        // Start with basic encounter
        const textChannel = interaction.channel as TextChannel;
        this.startEncounter(guildId, textChannel, quest);
    }

    async startEncounter(guildId: string, channel: TextChannel, quest: Quest) {
        // Start first quest encounter
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
        await interaction.reply("You attack the goblin for 5 damage!");
    }
}
