import { CommandInteraction, Interaction, MessageEmbed, TextChannel } from "discord.js";
import setGuildCommands from "../commands";
import { ACTIVITY, COMMAND_TYPE } from "../constants";
import CompendiumReader from "../services/CompendiumReader";
import ItemFactory from "../services/ItemFactory";
import CreatureFactory from "../services/CreatureFactory";
import TextBuilder from "../text";
import { Direction } from "../types";
import { getPlayersFromStartCommand, isEmpty, rand, sendTypingAndWaitRandom } from "../util";
import Encounter from "./Encounter";
import Monster from "./Monster";
import PlayerCharacter from "./PlayerCharacter";
import Quest from "./Quest";
import World from "./World";
import Character from "./Character";

interface PlayerTurnCallback {
    (): Promise<void>
}

export default class QuestLord {
    worlds: Record<string, World> = {};

    quests: Record<string, Quest> = {};

    creatureFactory: CreatureFactory;

    itemFactory: ItemFactory;

    constructor(compendium: CompendiumReader) {
        console.info("Summoning the Quest Lord...");
        this.itemFactory = new ItemFactory(compendium);
        this.creatureFactory = new CreatureFactory(compendium, this.itemFactory);
    }

    private assertWorldGenerated(guildId: string) {
        if (isEmpty(this.worlds[guildId])) {
            throw new Error("World not generated, aborting");
        }
    }

    private assertWorldNotGenerated(guildId: string) {
        if (!isEmpty(this.worlds[guildId])) {
            throw new Error("World already generated, aborting");
        }
    }

    private assertQuestStarted(guildId: string) {
        if (isEmpty(this.quests[guildId])) {
            throw new Error("Quest not started, aborting");
        }
    }

    private assertQuestNotStarted(guildId: string) {
        if (!isEmpty(this.quests[guildId])) {
            throw new Error("Quest already started, aborting");
        }
    }

    /* SLASH COMMAND HANDLING */

    async handleInteraction(interaction: Interaction) {
        try {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === "ping") {
                await interaction.reply("pong!");
            }

            if (!interaction.guildId) return;

            // Mod manually starts a quest for users
            if (interaction.commandName === "start") {
                await this.startQuest(interaction);
            }

            // User creates a character to join quest
            if (interaction.commandName === "play") {
                await this.createCharacter(interaction);
            }

            // User requests to travel in a direction
            if (interaction.commandName === "travel") {
                await this.handleTravel(interaction);
            }

            // User acts during an encounter
            if (interaction.commandName === "action") {
                await this.handleAction(interaction);
            }

            // User uses an item in their inventory
            if (interaction.commandName === "use") {
                await this.handleUse(interaction);
            }

            // User wants to look at their inventory
            if (interaction.commandName === "inventory") {
                await this.printInventory(interaction);
            }
        } catch (err) {
            if (interaction instanceof CommandInteraction) {
                console.error(`Failed to process '/${interaction.commandName}' command `
                    + `due to: ${err}`);
                await interaction.reply({
                    content: "Failed to handle command, please try again later.",
                    ephemeral: true
                });
            } else {
                console.error(`Failed to handle interaction due to: ${err}`);
            }
        }
    }

    private async startQuest(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertWorldNotGenerated(guildId);
        this.assertQuestNotStarted(guildId);

        // Create and register world for guild
        const world = new World(guildId);
        this.worlds[guildId] = world;


        // Create quest for user(s)
        const quest = new Quest(guildId);
        const players = getPlayersFromStartCommand(interaction);
        players.forEach(p => quest.addPlayer(p.id));
        quest.setPartyCoordinates(world.getRandomCoordinates());

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

    private async createCharacter(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const userId = interaction.user.id;
        // Ensure user is in questing party
        if (!quest.isUserInParty(userId)) {
            await interaction.reply({
                content: "Destiny has not claimed you yet, your time will come...",
                ephemeral: true
            });
        // Ensure user has not already created a character
        } else if (quest.isCharacterCreated(userId)) {
            await interaction.reply({
                content: "You already have a character in the questing party.",
                ephemeral: true
            });
        } else {
            const optionClass = interaction.options.getString("class", true);
            const character = this.creatureFactory.createCharacter(optionClass);
            const pc = quest.createPlayerCharacter(userId, character);
            // The name of the base character is the class name, the character name
            // is attached to the PlayerCharacter object
            await interaction.reply({
                content: `Character *${pc.getName()}*, level ${pc.lvl} ${optionClass}, created...`,
                ephemeral: true
            });
        }

        // If adding this character completes the party, then start the quest with an encounter
        if (quest.areAllCharactersCreated()) {
            const textChannel = interaction.channel as TextChannel;
            await this.startEncounter(guildId, textChannel);
        }
    }

    private async handleTravel(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const world = this.worlds[guildId];
        // Travel can only happen between encounters - this is already enforced by the
        // available commands
        if (quest.isInEncounter()) {
            await interaction.reply({ 
                content: "You cannot travel during an encounter.",
                ephemeral: true
            });
        } else {
            const direction = interaction.options.getString("direction", true) as Direction;
            try {
                const coordinates = quest.getPartyCoordinates();
                // Store current biome string in a variable for use
                const biome = world.getBiome(coordinates);
                // Apply the cardinal direction to the party's coordinates, this method throws an
                // error if the delta would move the party off the world
                const newCoordinates = world.applyDirectionToCoordinates(direction, coordinates);
                quest.setPartyCoordinates(newCoordinates);
                const newBiome = world.getBiome(newCoordinates);
                const newBiomeClause = biome === newBiome
                    ? `You make your way further into the ${newBiome}`
                    : `You find yourself in a ${newBiome}`;
                await interaction.reply(`You choose to travel ${direction}. ${newBiomeClause}.`);

                // Now that the party has reached a new location, start the next encounter
                const textChannel = interaction.channel as TextChannel;
                await this.startEncounter(guildId, textChannel);
            } catch (err) {
                await interaction.reply(`You cannot travel further ${direction}.`);
            }
        }
    }

    private async handleAction(interaction: CommandInteraction): Promise<void> {
        await this.handlePlayerTurn(interaction, async () => {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === "attack") {
                await this.handleAttack(interaction);
            }
            if (subcommand === "cast") {
                await this.handleCastSpell(interaction);
            }
        });
    }

    private async handleUse(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        async function useItem() {
            try {
                const item = interaction.options.getString("item", true);
                pc.getCharacter().useItem(item);
                await interaction.reply(`You use a ${item}.`);
            } catch (err) {
                await interaction.reply({
                    content: "You do not have this item!",
                    ephemeral: true
                });
            }
        }

        const encounter = quest.getEncounter();
        if (encounter) {
            if (encounter.getCurrentTurn() === pc.getCharacter()) {
                await useItem();
            } else {
                await interaction.reply({
                    content: "You can only use an item on your turn.",
                    ephemeral: true
                });
            }
        } else {
            await useItem();
        }   
    }

    private async printInventory(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];

        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        const inventory = pc.getCharacter().getInventory();
        const inventoryEmbed = inventory.length
            ? inventory.reduce((acc, curr, idx) => `${acc}\n**${idx + 1}.** ${curr}`, "")
            : "Inventory is empty";

        const embed = new MessageEmbed()
            .setColor("#0099ff")
            .setTitle("Your inventory")
            .setDescription(inventoryEmbed);
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    private logMapDisplay(interaction: CommandInteraction) {
        const guildId = interaction.guildId as string;
        const world = this.worlds[guildId];
        const quest = this.quests[guildId];

        const map = world.stringify(quest.getPartyCoordinates());
        console.info(map);
    }
    
    /* GAME METHODS */

    private async failQuest(guildId: string, channel: TextChannel): Promise<void> {
        // TODO: Do we want to remove the world as well?
        await setGuildCommands(guildId);
        delete this.quests[guildId];
        await channel.send("*Your party was slaughtered, and so ends this thread of destiny...*");
    }

    private async startEncounter(guildId: string, channel: TextChannel) {
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const monsters = this.creatureFactory.createRandomMonsterList(quest.getPartySize());
        const encounter = quest.startEncounter(monsters);

        // Get names of monsters in encounter
        const monsterNames = encounter.getMonsterNames();

        await sendTypingAndWaitRandom(channel, 3000);

        // Send text for the first encounter
        const textBuilder = new TextBuilder()
            .setActivity(ACTIVITY.ENCOUNTER).setSubActivity("start");
        const text = textBuilder.build(monsterNames);
        await channel.send(text);

        const turnOrder = encounter.getTurnOrderNames()
            .reduce((acc, curr, idx) => `${acc}\n**${idx + 1}.** ${curr}`, "");
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
        
        // If a monster goes first, handle its turn
        await channel.send(`It is ${currentTurn.getName()}'s turn.`);
        if (currentTurn instanceof Monster) {
            await this.handleMonsterTurn(guildId, channel);
        }
    }

    private async promptForTravel(guildId: string, channel: TextChannel) {
        this.assertQuestStarted(guildId);

        // Register guild commands for travel
        await setGuildCommands(guildId, { type: COMMAND_TYPE.TRAVEL });

        await sendTypingAndWaitRandom(channel, 3000);

        const world = this.worlds[guildId];
        const quest = this.quests[guildId];

        const partyBiome = world.getBiome(quest.getPartyCoordinates());
        await channel.send("You take stock of your surroundings - currently you're "
            + `in the ${partyBiome}. Where would you like to go? Use **/travel** to `
            + "choose a direction.");
    }

    private async handleNextTurn(guildId: string, channel: TextChannel) {
        const quest = this.quests[guildId];
        const encounter = quest.encounter as Encounter;

        if (encounter.isOver()) {
            const isTpk = !encounter.getTotalCharacterHp();
            quest.endEncounter();
            await channel.send("Combat is over!");
            if (isTpk) {
                await this.failQuest(guildId, channel);
            } else {
                await channel.send("The enemies lie dead at your feet...victory!");
                await this.promptForTravel(guildId, channel);
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

    private async handleMonsterTurn(guildId: string, channel: TextChannel) {
        const quest = this.quests[guildId];
        const encounter = quest.encounter as Encounter;

        const currentTurn = encounter.getCurrentTurn();
        if (currentTurn instanceof Monster) {
            const chars = encounter.getCharacters();
            const target = chars[rand(chars.length)];
            const damage = currentTurn.damage;
            target.setHp(target.hp - damage);
            await channel.send(`${currentTurn.getName()} deals ${damage} damage `
                + `to ${target.getName()}.`);

            await this.handleNextTurn(guildId, channel);
        }
    }

    private async handlePlayerTurn(
        interaction: CommandInteraction,
        doPlayerTurn: PlayerTurnCallback
    ) {
        const guildId = interaction.guildId as string;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
        const myPlayerCharacter = quest.getPlayerByUserId(interaction.user.id);
        if (currentTurn instanceof Character && currentTurn === myPlayerCharacter?.getCharacter()) {
            try {
                await doPlayerTurn();
            } catch(e) {
                const err = e instanceof Error ? e.message : "Unable to complete turn, try again.";
                await interaction.reply({
                    content: err,
                    ephemeral: true
                });
                return;
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

    private async handleAttack(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId as string;
        const quest = this.quests[guildId];
        const encounter = quest.encounter as Encounter;

        const targetIdx = interaction.options.getInteger("target") as number;

        const target = encounter.getMonsterByIndex(targetIdx);
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;

        const damage = pc.getCharacter().damage;
        target.setHp(target.hp - damage);

        const textBuilder = new TextBuilder()
            .setActivity(ACTIVITY.ATTACK).setSubActivity("melee");
        const weapon = pc.getCharacter().equipment.weapon;
        const weaponName = weapon ? weapon.name : "fists";
        const text = textBuilder.build(weaponName, target.getName());
        await interaction.reply(text);
        if (interaction.channel) {
            await interaction.channel.send(`You deal ${pc.getCharacter().damage} damage.`);
        }
    }

    private async handleCastSpell(interaction: CommandInteraction): Promise<void> {
        await interaction.reply("You try to cast a spell but it's not working...");
    }
}
