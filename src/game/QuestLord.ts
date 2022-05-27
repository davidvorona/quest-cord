import { CommandInteraction, Interaction } from "discord.js";
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
    }

    async startQuest(interaction: CommandInteraction): Promise<Quest> {
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

        // Start first quest encounter
        quest.startEncounter();
        const encounter = quest.getEncounter() as Encounter;
        const monster = encounter.monsters[0];
        const text = `You are attacked by ${encounter.monsters.length} ${monster.data.name}!`;
        await interaction.channel?.send(text);

        return quest;
    }
}
