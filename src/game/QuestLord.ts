import {
    Interaction,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    PermissionFlagsBits,
    TextChannel,
    EmbedBuilder,
    GuildMember,
    PermissionsBitField
} from "discord.js";
import CompendiumReader from "../services/CompendiumReader";
import ItemFactory from "../services/ItemFactory";
import EncounterBuilder from "../services/EncounterBuilder";
import CreatureFactory from "../services/CreatureFactory";
import {
    Direction,
    QuestLordInteraction,
    CommandInteraction,
    SelectMenuInteraction
} from "../types";
import { getPlayersFromStartCommand, isEmpty, rand, sendMissingPermissionsMessage } from "../util";
import Monster from "./Monster";
import PlayerCharacter from "./PlayerCharacter";
import Quest from "./Quest";
import World from "./World";
import TurnBasedEncounter from "./TurnBasedEncounter";
import Narrator from "./Narrator";
import CombatEncounter from "./CombatEncounter";
import SpellFactory from "../services/SpellFactory";
import StealthEncounter from "./StealthEncounter";
import SocialEncounter from "./SocialEncounter";
import MerchantEncounter from "./MerchantEncounter";
import LookoutEncounter from "./LookoutEncounter";
import RestEncounter from "./RestEncounter";

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

    private static isValidInteraction<T extends Interaction>(
        interaction: T
    ): interaction is QuestLordInteraction<T> {
        return interaction.inGuild() && interaction.channel instanceof TextChannel;
    }

    /* SLASH COMMAND HANDLING */

    async handleInteraction(interaction: Interaction) {
        if (interaction.isChatInputCommand()) {
            await this.handleCommandInteraction(interaction);
        }
        if (interaction.isStringSelectMenu()) {
            await this.handleSelectMenuInteraction(interaction);
        }
    }

    async handleCommandInteraction(interaction: ChatInputCommandInteraction) {
        try {
            if (!QuestLord.isValidInteraction(interaction)) return;

            if (interaction.commandName === "ping") {
                await interaction.reply("pong!");
            }

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

            // User wants to look at their inventory
            if (interaction.commandName === "inventory") {
                await this.printInventory(interaction);
            }

            // User wants to look at their character status
            if (interaction.commandName === "status") {
                await this.printStatus(interaction);
            }

            // User wants to look at the map
            if (interaction.commandName === "map") {
                this.logMapDisplay(interaction);
            }
        } catch (err) {
            if (interaction instanceof ChatInputCommandInteraction) {
                console.error(`Failed to process '/${interaction.commandName}' command `
                    + `due to: ${err}`);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: "Failed to handle command, please try again later.",
                        ephemeral: true
                    });
                }
            } else {
                console.error(`Failed to handle interaction due to: ${err}`);
            }
        }
    }

    async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
        try {
            if (!QuestLord.isValidInteraction(interaction)) return;

            // Choosing a target to attack
            if (interaction.customId === "target") {
                await this.handleAttack(interaction);
            }

            // Selecting a spell to cast
            if (interaction.customId === "spell:cast") {
                await this.handleCastSpell(interaction);
            }

            if (interaction.customId === "spell:target") {
                await this.handleSpellTarget(interaction);
            }

            // Choosing an item to use
            if (interaction.customId === "item:use") {
                await this.handleUse(interaction);
            }

            // Choosing an item to buy
            if (interaction.customId === "item:buy") {
                await this.handleBuy(interaction);
            }

            // Choosing an item to sell
            if (interaction.customId === "item:sell") {
                await this.handleSell(interaction);
            }
        } catch (err) {
            console.error(`Failed to handle interaction due to: ${err}`);
        }
    }

    private static validateStartCommandOptions(
        interaction: CommandInteraction,
        players: GuildMember[]
    ) {
        const { channels, members } = interaction.guild;
        const optionChannel = interaction.options.getChannel("channel", true);
        const channel = channels.cache.find(c => c.id === optionChannel.id);
        if (!channel || !(channel instanceof TextChannel)) {
            throw new Error("This is not a valid questing channel!");
        }
        const botMember = members.me;
        if (!botMember) {
            throw new Error("The bot does not exist in this guild!");
        }
        const questMembers = players.concat(botMember);
        const invalidPermissions: Record<string, PermissionsBitField> = {};
        questMembers.forEach((member) => {
            const permissions = member.permissionsIn(channel);
            const missingPermissions = [];
            if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
                missingPermissions.push(PermissionFlagsBits.ViewChannel);
            }
            if (!permissions.has(PermissionFlagsBits.SendMessages)) {
                missingPermissions.push(PermissionFlagsBits.SendMessages);
            }
            if (missingPermissions.length) {
                invalidPermissions[member.user.username] =
                    new PermissionsBitField(missingPermissions);
            }
        });
        return {
            errors: invalidPermissions,
            isValid: isEmpty(invalidPermissions)
        };
    }

    private async startQuest(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertWorldNotGenerated(guildId);
        this.assertQuestNotStarted(guildId);

        // Get the players and validate the channel permissions
        const players = getPlayersFromStartCommand(interaction);
        const { errors, isValid } = QuestLord.validateStartCommandOptions(interaction, players);
        if (!isValid) {
            await sendMissingPermissionsMessage(interaction, errors);
            return;
        }

        // Create and register world for guild
        const world = new World(guildId);
        this.worlds[guildId] = world;

        // Create narrator for quest
        const narrator = new Narrator(guildId, interaction.channel);

        // Create quest for user(s)
        const quest = new Quest(guildId, narrator);
        players.forEach(p => quest.addPlayer(p.id));
        quest.setPartyCoordinates(world.getRandomCoordinates());

        // Register new quest
        this.quests[guildId] = quest;

        // Defer reply in case guild commands take a while
        await interaction.deferReply({ ephemeral: true });

        await narrator.ponderAndReply(interaction, {
            content: `Quest created for **${players.length}** players...`,
            ephemeral: true
        });

        // Invite players to create characters and join the quest
        await narrator.ponderAndDescribe(
            `${players.join(" ")} Adventure calls you, **/play** to journey to *Discordia*...`
        );
    }

    private async createCharacter(interaction: CommandInteraction): Promise<void> {
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
            return;
        // Ensure user has not already created a character
        }
        if (quest.isCharacterCreated(userId)) {
            await interaction.reply({
                content: "You already have a character in the questing party.",
                ephemeral: true
            });
            return;
        }

        const optionClass = interaction.options.getString("class", true);
        const character = this.creatureFactory.createClassCharacter(optionClass);
        const pc = quest.createPlayerCharacter(userId, character);
        // The name of the base character is the class name, the character name
        // is attached to the PlayerCharacter object
        await narrator.ponderAndReply(interaction, {
            content: `Character *${pc.getName()}*, level ${pc.lvl} ${optionClass}, created...`,
            ephemeral: true
        });

        // If adding this character completes the party, then start the quest with an encounter
        if (quest.areAllCharactersCreated()) {
            await narrator.describeNewParty(quest.getCharacters());

            const world = this.worlds[guildId];
            const partyBiome = world.getBiome(quest.getPartyCoordinates());
            await narrator.describeSurroundings(partyBiome);

            await this.startEncounter(guildId);
        }
    }

    private async handleTravel(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const world = this.worlds[guildId];
        const narrator = quest.getNarrator();
        // Travel can only happen between encounters, or if the encounter is a RestEncounter
        if (quest.isInEncounter() && !(quest.encounter instanceof RestEncounter)) {
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

    // Actions are all things that can be done during encounters, or that have special
    // rules during encounters
    private async handleAction(interaction: CommandInteraction): Promise<void> {
        try {
            const guildId = interaction.guildId;
            this.assertQuestStarted(guildId);

            const subcommand = interaction.options.getSubcommand();
            if (subcommand === "attack") {
                await this.promptAttack(interaction);
            }
            if (subcommand === "cast") {
                await this.promptCastSpell(interaction);
            }
            if (subcommand === "use") {
                await this.promptUse(interaction);
            }
            if (subcommand === "sneak") {
                await this.handleSneak(interaction);
            }
            if (subcommand === "surprise") {
                await this.handleSurprise(interaction);
            }
            if (subcommand === "talk") {
                await this.handleTalk(interaction);
            }
            if (subcommand === "buy") {
                await this.promptBuy(interaction);
            }
            if (subcommand === "sell") {
                await this.promptSell(interaction);
            }
            if (subcommand === "lookout") {
                await this.handleLookout(interaction);
            }
        } catch (e) {
            const err = e instanceof Error ? e.message : "Unable to complete action, try again.";
            await interaction.reply({
                content: err,
                ephemeral: true
            });
            return;
        }
    }

    private async handleSneak(interaction: CommandInteraction): Promise<void> {
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
            await this.promptTravel(guildId);
        }
    }

    private async handleSurprise(interaction: CommandInteraction): Promise<void> {
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
            await this.promptTravel(guildId);
        }
    }

    private async handleTalk(interaction: CommandInteraction): Promise<void> {
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
            await this.promptTravel(guildId);
        }
    }

    private async promptBuy(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterCommand(interaction);
    }

    private async handleBuy(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterMenuSelect(interaction);

        if (!quest.isInEncounter()) {
            await this.promptTravel(guildId);
        }
    }

    private async promptSell(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterCommand(interaction);

        if (!quest.isInEncounter()) {
            await this.promptTravel(guildId);
        }
    }

    private async handleSell(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (!quest.isInEncounter() || !(quest.encounter instanceof MerchantEncounter)) {
            throw new Error("There is no active merchant encounter, aborting");
        }

        const narrator = quest.getNarrator();
        const encounter = quest.encounter;
        await narrator.ponderAndUpdate(interaction, "You offer to sell the merchant some of your "
            + "loot. Unfortunately, he's out of gold!");
        if (encounter.isOver()) {
            quest.endEncounter();
            await this.promptTravel(guildId);
        }
    }

    private async handleLookout(interaction: CommandInteraction): Promise<void> {
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
            await this.promptTravel(guildId);
        }
    }

    private async printInventory(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];

        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        const quantities = pc.getCharacter().getInventory().getQuantities();
        const inventoryEmbed = quantities.length
            ? quantities.reduce((acc, curr, idx) => `${acc}\n**${idx + 1}.** `
                + `${curr.item.name}: ${curr.quantity}`, "")
            : "Inventory is empty";

        const embed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Your inventory")
            .setDescription(inventoryEmbed);
        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    private async printStatus(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        console.log("Printing character status for guild", guildId);
    }

    private logMapDisplay(interaction: CommandInteraction) {
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

        // Narrate the encounter
        const narrator = quest.getNarrator();
        await narrator.describeEncounter(encounter);
        await narrator.explainEncounter(encounter);

        // If it's a turn-based encounter, then prompt for or handle the first turn
        if (encounter instanceof TurnBasedEncounter) {
            await this.handleTurn(guildId);
        }
    }

    private async promptTravel(guildId: string) {
        this.assertQuestStarted(guildId);

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
                await this.promptTravel(guildId);
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

    private async validatePlayerTurn(interaction: CommandInteraction | SelectMenuInteraction) {
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
        if (currentTurn !== myPlayerCharacter?.getCharacter()) {
            await interaction.reply({
                content: "It's not your turn!",
                ephemeral: true
            });
        }
    }

    private async promptUse(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        const encounter = quest.encounter;
        if (encounter && encounter instanceof TurnBasedEncounter) {
            await this.validatePlayerTurn(interaction);
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription("Which item are you using?");
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        const options = pc.getCharacter().getInventory().getInteractionOptions();
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("item:use")
                    .setPlaceholder("Nothing selected")
                    .addOptions(options)
            );
        await interaction.reply({
            ephemeral: true,
            embeds: [embed],
            components: [row]
        });
    }

    private async handleUse(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;
        async function useItem() {
            try {
                const item = interaction.values[0];
                pc.getCharacter().useItem(item);
                const narrator = quest.getNarrator();
                await narrator.ponderAndUpdate(interaction, {
                    content: `You use the ${item}.`,
                    components: [],
                    embeds: []
                });
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
                await this.handleNextTurn(guildId);
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

    private async promptAttack(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        await this.validatePlayerTurn(interaction);

        if (!quest.isInEncounter() || !(quest.encounter instanceof CombatEncounter)) {
            throw new Error("There is no active combat encounter, aborting");
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription("Who do you want to attack?");
        const options = quest.encounter.getMonsterNames().map((n: string, idx) => ({
            label: n,
            value: idx.toString()
        }));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("target")
                    .setPlaceholder("Nothing selected")
                    .addOptions(options)
            );
        await interaction.reply({
            ephemeral: true,
            embeds: [embed],
            components: [row]
        });
    }

    private async handleAttack(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        await this.validatePlayerTurn(interaction);

        if (!quest.isInEncounter() || !(quest.encounter instanceof CombatEncounter)) {
            throw new Error("There is no active combat encounter, aborting");
        }

        const encounter = quest.encounter;
        const targetIdx = Number(interaction.values[0]);

        const target = encounter.getMonsterByIndex(targetIdx);
        const pc = quest.getPlayerByUserId(interaction.user.id) as PlayerCharacter;

        const narrator = quest.getNarrator();
        await narrator.ponderAndUpdate(interaction, {
            content: "You prepare to attack the creature...",
            components: [],
            embeds: []
        });
        const damage = encounter.calculateDamage(pc.getCharacter());
        target.setHp(target.hp - damage);

        await narrator.describeAttack(pc.getCharacter(), target, damage);

        await this.handleNextTurn(guildId);
    }

    private async promptCastSpell(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        await this.validatePlayerTurn(interaction);

        if (!quest.isInEncounter() || !(quest.encounter instanceof CombatEncounter)) {
            throw new Error("There is no active combat encounter, aborting");
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription("What spell do you want to cast?");
        const pc = quest.getPlayerByUserId(interaction.user.id);
        if (!pc) {
            throw new Error("You do not have a character, aborting");
        }
        const options = pc.character.getSpells().map(s => ({
            label: s.name,
            value: s.id
        }));
        if (options.length) {
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("spell:cast")
                        .setPlaceholder("Nothing selected")
                        .addOptions(options)
                );
            await interaction.reply({
                ephemeral: true,
                embeds: [embed],
                components: [row]
            });
        } else {
            throw new Error("You have no spells to cast!");
        }

    }

    private async handleCastSpell(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        await this.validatePlayerTurn(interaction);

        if (!quest.isInEncounter() || !(quest.encounter instanceof CombatEncounter)) {
            throw new Error("There is no active combat encounter, aborting");
        }

        const spellId = interaction.values[0];

        const pc = quest.getPlayerByUserId(interaction.user.id);
        if (!pc) {
            throw new Error("You do not have a character, aborting");
        }
        const spell = pc.getCharacter().getSpell(spellId);
        if (!spell) {
            throw new Error("You do not have this spell, aborting");
        }
        pc.holdSpell(spellId);

        const narrator = quest.getNarrator();
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription(`You choose to cast **${spell.name}**. Who do you want to target?`);
        const options = quest.encounter.getMonsterNames().map((n: string, idx) => ({
            label: n,
            value: idx.toString()
        }));
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("spell:target")
                    .setPlaceholder("Nothing selected")
                    .addOptions(options)
            );
        await narrator.ponderAndUpdate(interaction, {
            components: [row],
            embeds: [embed]
        });
    }

    private async handleSpellTarget(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        const quest = this.quests[guildId];

        await this.validatePlayerTurn(interaction);

        if (!quest.isInEncounter() || !(quest.encounter instanceof CombatEncounter)) {
            throw new Error("There is no active combat encounter, aborting");
        }

        const pc = quest.getPlayerByUserId(interaction.user.id);
        if (!pc) {
            throw new Error("You do not have a character, aborting");
        }

        const heldSpell = pc.getHeldSpell();
        if (!heldSpell) {
            throw new Error("You are not holding this spell");
        }

        const narrator = quest.getNarrator();
        narrator.ponderAndUpdate(interaction, {
            content: "You prepare to cast the spell...",
            embeds: [],
            components: []
        });
        await narrator.describeCastSpell(pc.getCharacter(), heldSpell);

        pc.releaseSpell();

        await this.handleNextTurn(guildId);
    }
}
