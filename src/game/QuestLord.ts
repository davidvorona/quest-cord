import { CommandInteraction, Interaction, MessageEmbed, TextChannel } from "discord.js";
import setGuildCommands from "../commands";
import { ACTIVITY, COMMAND_TYPE } from "../constants";
import TextBuilder from "../text";
import { getPlayersFromStartCommand, isEmpty, rand, sendTypingAndWaitRandom } from "../util";
import Encounter from "./Encounter";
import Monster from "./Monster";
import PlayerCharacter from "./PlayerCharacter";
import Quest from "./Quest";

interface PlayerTurnCallback {
    (): Promise<void>
}

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

        if (interaction.commandName === "use") {
            await this.handleUse(interaction);
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
            const optionClass = interaction.options.getString("class") as string;
            const pc = quest.createCharacter(userId, optionClass);
            await interaction.reply({
                content: `Character *${pc.getName()}*, level ${pc.lvl} ${pc.getName()}, created...`,
                ephemeral: true
            });
        }

        if (quest.areAllCharactersCreated()) {
            await setGuildCommands(guildId);
            const textChannel = interaction.channel as TextChannel;
            await this.startEncounter(guildId, textChannel);
        }
    }

    async failQuest(guildId: string, channel: TextChannel): Promise<void> {
        await setGuildCommands(guildId);
        delete this.quests[guildId];
        await channel.send("*Your party was slaughtered, and so ends this thread of destiny...*");
    }

    async startEncounter(guildId: string, channel: TextChannel) {
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId] as Quest;
        quest.startEncounter();

        // Get encounter data
        const encounter = quest.getEncounter() as Encounter;
        const monsterNames = encounter.getMonsterNames();

        await sendTypingAndWaitRandom(channel, 3000);

        // Send text for the first encounter
        const textBuilder = new TextBuilder().setActivity(ACTIVITY.ENCOUNTER).setSubActivity("start");
        const text = textBuilder.build(monsterNames);
        await channel.send(text);

        const turnOrder = encounter.getTurnOrderNames().reduce((acc, curr, idx) => `${acc}\n**${idx + 1}.** ${curr}`, "");
        const embed = new MessageEmbed()
            .setColor("#0099ff")
            .setTitle("Turn order")
            .setDescription(turnOrder);
        await channel.send({ embeds: [embed] });

        // Register guild commands for encounter
        await setGuildCommands(guildId, {
            type: COMMAND_TYPE.ENCOUNTER,
            targets: monsterNames
        });

        const currentTurn = encounter.getCurrentTurn();

        await sendTypingAndWaitRandom(channel, 3000);

        await channel.send(`It is ${currentTurn.getName()}'s turn.`);
        if (currentTurn instanceof Monster) {
            await this.handleMonsterTurn(guildId, channel);
        }
    }

    async handleNextTurn(guildId: string, channel: TextChannel) {
        const quest = this.quests[guildId] as Quest;
        const encounter = quest.encounter as Encounter;

        if (encounter.isOver()) {
            const isTpk = !encounter.getTotalPcHp();
            await channel.send("Combat is over!");
            if (isTpk) {
                await this.failQuest(guildId, channel);
            } else {
                await channel.send("The enemies lie dead at your feet...victory!");
            }
            return;
        }

        encounter.nextTurn();
        const currentTurn = encounter.getCurrentTurn();

        await sendTypingAndWaitRandom(channel, 3000);
        
        await channel.send(`It is now ${currentTurn.getName()}'s turn.`);
        if (currentTurn instanceof Monster) {
            await this.handleMonsterTurn(guildId, channel);
        }
    }

    async handleMonsterTurn(guildId: string, channel: TextChannel) {
        const quest = this.quests[guildId] as Quest;
        const encounter = quest.encounter as Encounter;

        const currentTurn = encounter.getCurrentTurn();
        if (currentTurn instanceof Monster) {
            const pcs = encounter.getPcs();
            const target = pcs[rand(pcs.length)];
            const damage = currentTurn.damage;
            target.setHp(target.hp - damage);
            await channel.send(`${currentTurn.getName()} deals ${damage} damage to ${target.getName()}.`);

            await this.handleNextTurn(guildId, channel);
        }
    }

    async handlePlayerTurn(interaction: CommandInteraction, doPlayerTurn: PlayerTurnCallback) {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId] as Quest;
        quest.assertEncounterStarted();

        const userId = interaction.user.id;
        if (!quest.isUserInParty(userId)) {
            await interaction.reply({
                content: "You are not on this quest. Destiny will call on you soon enough...",
                ephemeral: true
            });
            return;
        }

        const encounter = quest.encounter as Encounter;
        const currentTurn = encounter.getCurrentTurn();
        if (currentTurn instanceof PlayerCharacter && currentTurn.userId === userId) {
            try {
                await doPlayerTurn();
            } catch(e) {
                const err = e instanceof Error ? e.message : "Unable to complete turn, try again.";
                await interaction.reply({
                    content: err,
                    ephemeral: true
                });
            }
            const textChannel = interaction.channel as TextChannel;
            await this.handleNextTurn(guildId, textChannel);
        } else {
            await interaction.reply({
                content: "It's not your turn!",
                ephemeral: true
            });
        }
    }

    async handleAttack(interaction: CommandInteraction): Promise<void> {
        await this.handlePlayerTurn(interaction, async () => {
            const guildId = interaction.guildId as string;
            const quest = this.quests[guildId] as Quest;
            const encounter = quest.encounter as Encounter;

            const targetIdx = interaction.options.getInteger("target") as number;

            const target = encounter.getMonsterByIndex(targetIdx);
            const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
    
            const damage = pc.damage;
            target.setHp(target.hp - damage);
    
            const textBuilder = new TextBuilder().setActivity(ACTIVITY.ATTACK).setSubActivity("melee");
            const weapon = pc.weapons[0];
            const text = textBuilder.build(weapon, target.getName());
            await interaction.reply(text);
            if (interaction.channel) {
                await interaction.channel.send(`You deal ${pc.damage} damage.`);
            }
        });
        
    }

    async handleUse(interaction: CommandInteraction): Promise<void> {
        await this.handlePlayerTurn(interaction, async () => {
            const guildId = interaction.guildId as string;
            const quest = this.quests[guildId] as Quest;

            const item = interaction.options.getString("item") as string;
            const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;

            pc.useItem(item);

            await interaction.reply(`You use a ${item}`);
        });
    }
}
