import {
    CommandInteraction,
    Interaction,
    MessageEmbed,
    GuildTextBasedChannel,
    TextChannel
} from "discord.js";
import setGuildCommands from "../commands";
import { CommandType } from "../constants";
import CompendiumReader from "../services/CompendiumReader";
import ItemFactory from "../services/ItemFactory";
import EncounterBuilder from "../services/EncounterBuilder";
import CreatureFactory from "../services/CreatureFactory";
import { Direction } from "../types";
import { getPlayersFromStartCommand, isEmpty, rand } from "../util";
import Monster from "./Monster";
import PlayerCharacter from "./PlayerCharacter";
import Quest from "./Quest";
import World from "./World";
import Character from "./Character";
import TurnBasedEncounter from "./TurnBasedEncounter";
import Narrator from "./Narrator";
import CombatEncounter from "./CombatEncounter";
import SpellFactory from "../services/SpellFactory";
import StealthEncounter from "./StealthEncounter";
import SocialEncounter from "./SocialEncounter";
import MerchantEncounter from "./MerchantEncounter";
import LookoutEncounter from "./LookoutEncounter";

type QuestLordInteraction = CommandInteraction & {
    guildId: string;
    channel: GuildTextBasedChannel;
};

interface PlayerTurnCallback {
    (): Promise<void>
}

export default class QuestLord {
    worlds: Record<string, World> = {};

    quests: Record<string, Quest> = {};

    creatureFactory: CreatureFactory;

    itemFactory: ItemFactory;

    spellFactory: SpellFactory;

    encounterBuilder: EncounterBuilder;

    constructor(compendium: CompendiumReader) {
        console.info("Summoning the Quest Lord...");
        this.itemFactory = new ItemFactory(compendium);
        this.spellFactory = new SpellFactory(compendium);
        this.creatureFactory = new CreatureFactory(compendium, this.itemFactory, this.spellFactory);
        this.encounterBuilder = new EncounterBuilder(this.creatureFactory);
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

    private static isValidInteraction(
        interaction: CommandInteraction
    ): interaction is QuestLordInteraction {
        return interaction.inGuild() && interaction.channel instanceof TextChannel;
    }

    /* SLASH COMMAND HANDLING */

    async handleInteraction(interaction: Interaction) {
        try {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === "ping") {
                await interaction.reply("pong!");
            }

            if (!QuestLord.isValidInteraction(interaction)) return;

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

            if (interaction.commandName === "sneak") {
                await this.handleSneak(interaction);
            }

            if (interaction.commandName === "surprise") {
                await this.handleSurprise(interaction);
            }

            if (interaction.commandName === "talk") {
                await this.handleTalk(interaction);
            }

            if (interaction.commandName === "buy") {
                this.handleBuy(interaction);
            }

            if (interaction.commandName === "sell") {
                await this.handleSell(interaction);
            }

            if (interaction.commandName === "lookout") {
                await this.handleLookout(interaction);
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

    private async startQuest(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertWorldNotGenerated(guildId);
        this.assertQuestNotStarted(guildId);

        // Create and register world for guild
        const world = new World(guildId);
        this.worlds[guildId] = world;

        // Create narrator for quest
        const narrator = new Narrator(guildId, interaction.channel);

        // Create quest for user(s)
        const quest = new Quest(guildId, narrator);
        const players = getPlayersFromStartCommand(interaction);
        players.forEach(p => quest.addPlayer(p.id));
        quest.setPartyCoordinates(world.getRandomCoordinates());

        // Register new quest
        this.quests[guildId] = quest;

        // Defer reply in case guild commands take a while
        await interaction.deferReply({ ephemeral: true });

        // Register guild commands for character creation
        await setGuildCommands(guildId, { type: CommandType.NewQuest });

        await narrator.ponderAndReply(interaction, {
            content: `Quest created for **${players.length}** players...`,
            ephemeral: true
        });

        // Invite players to create characters and join the quest
        await narrator.ponderAndDescribe(
            `${players.join(" ")} Adventure calls you, **/play** to journey to *Discordia*...`
        );
    }

    private async createCharacter(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const narrator = quest.getNarrator();
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
            const character = this.creatureFactory.createClassCharacter(optionClass);
            const pc = quest.createPlayerCharacter(userId, character);
            // The name of the base character is the class name, the character name
            // is attached to the PlayerCharacter object
            await narrator.ponderAndReply(interaction, {
                content: `Character *${pc.getName()}*, level ${pc.lvl} ${optionClass}, created...`,
                ephemeral: true
            });
        }

        // If adding this character completes the party, then start the quest with an encounter
        if (quest.areAllCharactersCreated()) {
            await narrator.describeNewParty(quest.getCharacters());

            const world = this.worlds[guildId];
            const partyBiome = world.getBiome(quest.getPartyCoordinates());
            await narrator.describeSurroundings(partyBiome);

            await this.startEncounter(guildId);
        }
    }

    private async handleTravel(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const world = this.worlds[guildId];
        const narrator = quest.getNarrator();
        // Travel can only happen between encounters - this is already enforced by the
        // available commands
        if (quest.isInEncounter()) {
            await interaction.reply({ 
                content: "You cannot travel during an encounter.",
                ephemeral: true
            });
        } else {
            const direction = interaction.options.getString("direction", true) as Direction;
            const coordinates = quest.getPartyCoordinates();
            // Store current biome string in a variable for use
            const biome = world.getBiome(coordinates);

            let x, y;
            try {
                // Apply the cardinal direction to the party's coordinates, this method throws an
                // error if the delta would move the party off the world
                [x, y] = world.applyDirectionToCoordinates(direction, coordinates);
            } catch (err) {
                await interaction.reply(`You cannot travel further ${direction}.`);
                return;
            }

            // Set the new coordinates, and continue
            quest.setPartyCoordinates([x, y]);

            const newBiome = world.getBiome([x, y]);
            await narrator.ponderAndReply(interaction, `You choose to travel ${direction}.`);
            await narrator.describeTravel(biome, newBiome);

            // Now that the party has reached a new location, start the next encounter
            await this.startEncounter(guildId);
        }
    }

    private async handleAction(interaction: QuestLordInteraction): Promise<void> {
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

    private async handleUse(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        async function useItem() {
            try {
                const item = interaction.options.getString("item", true);
                pc.getCharacter().useItem(item);
                const narrator = quest.getNarrator();
                await narrator.ponderAndReply(interaction, `You use the ${item}.`);
            } catch (err) {
                await interaction.reply({
                    content: "You do not have this item!",
                    ephemeral: true
                });
            }
        }

        const encounter = quest.getEncounter();
        if (encounter && encounter instanceof TurnBasedEncounter) {
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

    private async handleSneak(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof StealthEncounter)) {
            throw new Error("There is no active stealth encounter, aborting");
        }

        const narrator = quest.getNarrator();
        await narrator.ponderAndReply(interaction, "You sneak past the enemies.");
        const encounter = quest.encounter;
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptForTravel(guildId);
        }
    }

    private async handleSurprise(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof StealthEncounter)) {
            throw new Error("There is no active stealth encounter, aborting");
        }

        const narrator = quest.getNarrator();
        await narrator.ponderAndReply(interaction, "You're about to mount a surprise attack "
            + "when you reconsider, and decide to sneak past instead.");
        const encounter = quest.encounter;
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptForTravel(guildId);
        }
    }

    private async handleTalk(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof SocialEncounter)) {
            throw new Error("There is no active social encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        const npcName = encounter.getNpcNames()[0];
        await narrator.ponderAndReply(interaction, "You walk up to the figure, and "
            + `strike up a conversation. Their name is ${npcName}. After some pleasant `
            + "talk, you bid farewell and continue on your way.");
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptForTravel(guildId);
        }
    }

    private async handleBuy(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof MerchantEncounter)) {
            throw new Error("There is no active merchant encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        await narrator.ponderAndReply(interaction, "You offer to pay gold for the merchant's "
            + "goods. Unfortunately, he's out of stock!");
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptForTravel(guildId);
        }
    }

    private async handleSell(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof MerchantEncounter)) {
            throw new Error("There is no active merchant encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        await narrator.ponderAndReply(interaction, "You offer to sell the merchant some of your "
            + "loot. Unfortunately, he's out of gold!");
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptForTravel(guildId);
        }
    }

    private async handleLookout(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof LookoutEncounter)) {
            throw new Error("There is no active lookout encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        await narrator.ponderAndReply(interaction, "You take in the view, expanding your "
            + "map in all directions.");
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptForTravel(guildId);
        }
    }

    private async printInventory(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
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

    private logMapDisplay(interaction: QuestLordInteraction) {
        const guildId = interaction.guildId;
        const world = this.worlds[guildId];
        const quest = this.quests[guildId];

        const map = world.stringify(quest.getPartyCoordinates());
        console.info(map);
    }
    
    /* GAME METHODS */

    private async failQuest(guildId: string): Promise<void> {
        const quest = this.quests[guildId];
        const narrator = quest.getNarrator();
        await narrator.ponderAndDescribe(
            "*Your party was slaughtered, and so ends this thread of destiny...*"
        );
        await setGuildCommands(guildId);
        delete this.quests[guildId];
    }

    private async startEncounter(guildId: string) {
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const world = this.worlds[guildId];

        // Build an encounter and start it for the quest
        const biome = world.getBiome(quest.getPartyCoordinates());
        const encounter = this.encounterBuilder.build(biome, quest.getCharacters());
        quest.startEncounter(encounter);

        // TODO: This needs to be handled elsewhere
        if (encounter instanceof CombatEncounter) {
            const monsterNames = encounter.getMonsterNames();
            await setGuildCommands(guildId, {
                type: CommandType.Combat,
                targets: monsterNames
            });
        } else if (encounter instanceof StealthEncounter) {
            const monsterNames = encounter.getMonsterNames();
            await setGuildCommands(guildId, {
                type: CommandType.Stealth,
                targets: monsterNames
            });
        } else if (encounter instanceof SocialEncounter) {
            await setGuildCommands(guildId, {
                type: CommandType.Social
            });
        } else if (encounter instanceof MerchantEncounter) {
            await setGuildCommands(guildId, {
                type: CommandType.Merchant
            });
        } else if (encounter instanceof LookoutEncounter) {
            await setGuildCommands(guildId, {
                type: CommandType.Lookout
            });
        } else {
            quest.endEncounter();
            await setGuildCommands(guildId, { type: CommandType.Questing });
        }

        // Narrate the encounter
        const narrator = quest.getNarrator();
        await narrator.describeEncounter(encounter);
        await narrator.explainEncounter(encounter);

        // If it's a turn-based encounter, then prompt for or handle the first turn
        if (encounter instanceof TurnBasedEncounter) {
            await this.handleTurn(guildId);
        }
    }

    private async promptForTravel(guildId: string) {
        this.assertQuestStarted(guildId);

        // Register guild commands for travel
        await setGuildCommands(guildId, { type: CommandType.Questing });

        const world = this.worlds[guildId];
        const quest = this.quests[guildId];

        // Describe surroundings
        const narrator = quest.getNarrator();
        const partyBiome = world.getBiome(quest.getPartyCoordinates());
        await narrator.describeSurroundings(partyBiome);
        await narrator.ponderAndDescribe("Where would you like to go? Use **/travel** to "
            + "choose a direction.");
    }

    private async handleTurn(guildId: string) {
        const quest = this.quests[guildId];
        
        if (!quest.isInEncounter() || !(quest.encounter instanceof TurnBasedEncounter)) {
            throw new Error("There is no active turn-based encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        const currentTurn = encounter.getCurrentTurn();            
        await narrator.ponderAndDescribe(`It is ${currentTurn.getName()}'s turn.`);
        // If its a monster's turn, invoke its handler
        if (currentTurn instanceof Monster) {
            await this.handleMonsterTurn(guildId);
        }
    }

    private async handleNextTurn(guildId: string) {
        const quest = this.quests[guildId];
        
        if (!quest.isInEncounter() || !(quest.encounter instanceof TurnBasedEncounter)) {
            throw new Error("There is no active turn-based encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        if (encounter.isOver()) {
            const isSuccess = encounter.isSuccess();
            await narrator.describeEncounterOver(encounter);
            quest.endEncounter();
            if (isSuccess) {
                await this.promptForTravel(guildId);
            } else {
                await this.failQuest(guildId);
            }
            return;
        }

        encounter.nextTurn();

        await this.handleTurn(guildId);
    }

    private async handleMonsterTurn(guildId: string) {
        const quest = this.quests[guildId];

        if (!quest.isInEncounter() || !(quest.encounter instanceof TurnBasedEncounter)) {
            throw new Error("There is no active turn-based encounter, aborting");
        }

        const encounter = quest.encounter;
        const narrator = quest.getNarrator();

        if (encounter instanceof CombatEncounter) {
            const currentTurn = encounter.getCurrentTurn();
            if (currentTurn instanceof Monster) {
                const chars = encounter.getCharacters();
                const target = chars[rand(chars.length)];
                const damage = encounter.calculateDamage(currentTurn);
                target.setHp(target.hp - damage);
                await narrator.ponderAndDescribe(`${currentTurn.getName()} deals ${damage} damage `
                    + `to ${target.getName()}.`);

                await this.handleNextTurn(guildId);
            }
        }
    }

    private async handlePlayerTurn(
        interaction: QuestLordInteraction,
        doPlayerTurn: PlayerTurnCallback
    ) {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];

        const userId = interaction.user.id;
        if (!quest.isUserInParty(userId)) {
            await interaction.reply({
                content: "You are not on this quest. Destiny will call on you soon enough...",
                ephemeral: true
            });
            return;
        }
        if (
            !quest.isInEncounter()
            || !(quest.encounter instanceof TurnBasedEncounter)
        ) {
            await interaction.reply({
                content: "You are not currently in a turn-based encounter.",
                ephemeral: true
            });
            return;
        }

        const encounter = quest.encounter;
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
            await this.handleNextTurn(guildId);
        } else {
            await interaction.reply({
                content: "It's not your turn!",
                ephemeral: true
            });
        }
    }

    private async handleAttack(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        if (!quest.isInEncounter() || !(quest.encounter instanceof CombatEncounter)) {
            throw new Error("There is no active combat encounter, aborting");
        }

        const encounter = quest.encounter;
        const targetIdx = interaction.options.getInteger("target", true);

        const target = encounter.getMonsterByIndex(targetIdx);
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;

        const narrator = quest.getNarrator();
        await narrator.ponderAndReply(interaction, "You prepare to attack the creature...");
        const damage = encounter.calculateDamage(pc.getCharacter());
        target.setHp(target.hp - damage);

        await narrator.describeAttack(pc.getCharacter(), target, damage);
    }

    private async handleCastSpell(interaction: QuestLordInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];
        const narrator = quest.getNarrator();

        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        const spell = interaction.options.getString("spell", true);
        await narrator.ponderAndReply(interaction, "You prepare to cast the spell...");
        await narrator.describeCastSpell(pc.getCharacter(), spell);
    }
}
