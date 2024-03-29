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
    PermissionsBitField,
    AttachmentBuilder
} from "discord.js";
import CompendiumReader from "../services/CompendiumReader";
import ItemFactory from "../services/ItemFactory";
import EncounterBuilder from "../services/EncounterBuilder";
import { PollType } from "./polls/PollBooth";
import CreatureFactory from "../services/CreatureFactory";
import {
    Direction,
    QuestLordInteraction,
    CommandInteraction,
    SelectMenuInteraction
} from "../types";
import { getPlayersFromStartCommand, isEmpty, sendMissingPermissionsMessage } from "../util";
import Quest from "./Quest";
import World from "./World";
import Narrator from "./Narrator";
import SpellFactory from "../services/SpellFactory";
import Inventory from "./creatures/Inventory";
import FreeEncounter from "./encounters/FreeEncounter";
import { EncounterResults } from "./encounters/Encounter";
import CombatEncounter from "./encounters/combat/CombatEncounter";
import StealthEncounter from "./encounters/stealth/StealthEncounter";
import { EncounterType } from "../constants";
import { getHelpText } from "../commands";

export default class QuestLord {
    worlds: Record<string, World> = {};

    quests: Record<string, Quest> = {};

    creatureFactory: CreatureFactory;

    itemFactory: ItemFactory;

    spellFactory: SpellFactory;

    encounterBuilder: EncounterBuilder;

    forceEncounters: Record<string, EncounterType> = {};

    constructor(compendium: CompendiumReader) {
        console.info("Summoning the Quest Lord...");
        this.itemFactory = new ItemFactory(compendium);
        this.spellFactory = new SpellFactory(compendium);
        this.creatureFactory = new CreatureFactory(compendium, this.itemFactory, this.spellFactory);
        this.encounterBuilder = new EncounterBuilder(this.creatureFactory);
    }

    /* VALIDATION */

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

    private assertQuestStarted(channelId: string) {
        if (isEmpty(this.quests[channelId])) {
            throw new Error("Quest not started, aborting");
        }
    }

    private assertQuestNotStarted(channelId: string) {
        if (!isEmpty(this.quests[channelId])) {
            throw new Error("Quest already started, aborting");
        }
    }

    private static isValidInteraction<T extends Interaction>(
        interaction: T
    ): interaction is QuestLordInteraction<T> {
        return interaction.inGuild() && interaction.channel instanceof TextChannel;
    }

    private static validateStartCommandOptions(
        interaction: CommandInteraction,
        players: GuildMember[]
    ) {
        const { channels, members } = interaction.guild;

        const optionChannel = interaction.options.getChannel("channel");
        const channel = optionChannel
            ? channels.cache.find(c => c.id === optionChannel.id)
            : interaction.channel;
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

    /* INTERACTIONS */

    async handleInteraction(interaction: Interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await this.handleCommandInteraction(interaction);
            }
            if (interaction.isStringSelectMenu()) {
                await this.handleSelectMenuInteraction(interaction);
            }
        } catch (err) {
            console.error("Something went very wrong:", err);
        }
    }

    async handleCommandInteraction(interaction: ChatInputCommandInteraction) {
        try {
            console.info(
                `Processing command '${interaction.commandName}'`,
                "with options", interaction.options
            );
            if (!QuestLord.isValidInteraction(interaction)) return;

            if (interaction.commandName === "ping") {
                await interaction.reply("pong!");
            }

            if (interaction.commandName === "help") {
                await interaction.reply({
                    content: getHelpText(),
                    ephemeral: true
                });
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

            // User wants to move (in a combat encounter)
            if (interaction.commandName === "move") {
                await this.handleMove(interaction);
            }

            // User character uses an item
            if (interaction.commandName === "use") {
                await this.promptUse(interaction);
            }

            // User acts during an encounter
            if (interaction.commandName === "action") {
                await this.handleAction(interaction);
            }

            // User wants to look at their inventory
            if (interaction.commandName === "inventory") {
                await this.displayInventory(interaction);
            }

            // User wants to look at their character status
            if (interaction.commandName === "status") {
                await this.displayStatus(interaction);
            }

            // User wants to look at the map
            if (interaction.commandName === "map") {
                await this.displayLocalMap(interaction);
            }

            // Debug commands
            if (interaction.commandName === "forcefail") {
                await this.forceFailQuest(interaction);
            }
            if (interaction.commandName === "forceencounter") {
                await this.forceEncounterType(interaction);
            }
        } catch (err) {
            const errMessage = err instanceof Error
                ? err.message : "Unable to handle command, try again.";
            console.error(`Failed to process '/${interaction.commandName}' command `
                + "due to:", errMessage);
            if (!interaction.replied) {
                await interaction.reply({
                    content: errMessage,
                    ephemeral: true
                });
            }
        }
    }

    async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
        try {
            console.info(
                `Processing selection '${interaction.customId}'`,
                "with values", interaction.values
            );
            if (!QuestLord.isValidInteraction(interaction)) return;

            // Choosing a target to attack
            if (interaction.customId === "attack") {
                await this.handleAttack(interaction);
            }

            // Selecting a spell to cast
            if (interaction.customId === "spell:cast") {
                await this.handleCastSpell(interaction);
            }

            // Choosing a target for a held spell
            if (interaction.customId === "spell:target") {
                await this.handleSpellTarget(interaction);
            }

            // Choosing an item to use
            if (interaction.customId === "use") {
                await this.handleUse(interaction);
            }

            // Choosing an item to buy
            if (interaction.customId === "buy") {
                await this.handleBuy(interaction);
            }

            // Choosing an item to sell
            if (interaction.customId === "sell") {
                await this.handleSell(interaction);
            }
        } catch (err) {
            const errMessage = err instanceof Error
                ? err.message : "Unable to submit selection, try again.";
            console.error(`Failed to process selection for '${interaction.customId}' `
                + "due to:", err);
            try {
                await interaction.update({
                    content: errMessage,
                });
            } catch (e) {
                await interaction.editReply({
                    content: errMessage
                });
            }

        }
    }

    // Actions are all things that can be done during encounters, or that have special
    // rules during encounters
    private async handleAction(interaction: CommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();
        try {
            const channelId = interaction.channelId;
            this.assertQuestStarted(channelId);

            if (subcommand === "attack") {
                await this.promptAttack(interaction);
            }
            if (subcommand === "spell") {
                await this.promptCastSpell(interaction);
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
            if (subcommand === "ignore") {
                await this.handleIgnore(interaction);
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
            const errMessage = e instanceof Error
                ? e.message : "Unable to complete action, try again.";
            console.error(`Failed to handle action '${subcommand}' due to:`, e);
            if (!interaction.replied) {
                await interaction.reply({
                    content: errMessage,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: errMessage
                });
            }
        }
    }

    private async startQuest(interaction: CommandInteraction): Promise<void> {
        // Get the players and validate the channel permissions
        const players = getPlayersFromStartCommand(interaction);
        const { errors, isValid } = QuestLord.validateStartCommandOptions(interaction, players);
        if (!isValid) {
            await sendMissingPermissionsMessage(interaction, errors);
            return;
        }

        const { guildId } = interaction;

        // Create and register world for guild
        const world = this.worlds[guildId] || new World(guildId);
        this.worlds[guildId] = world;

        // Create narrator for quest
        const questChannel = interaction.options.getChannel("channel") || interaction.channel;
        if (!(questChannel instanceof TextChannel)) {
            throw new Error(`Invalid channel '${questChannel.id}' of type '${questChannel.type}'`);
        }

        const channelId = questChannel.id;
        this.assertQuestNotStarted(channelId);

        const narrator = new Narrator(guildId, questChannel);

        // Create quest for user(s)
        const userIds = players.map(p => p.id);
        const quest = new Quest(guildId, channelId, userIds, narrator);
        quest.setPartyCoordinates(world.getRandomCoordinates());

        // Register new quest
        this.quests[channelId] = quest;

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
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
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
        const { lvlGains } = this.creatureFactory.getCharacterClass(optionClass);
        const pc = quest.createPlayerCharacter(userId, character, lvlGains);

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

            const forceType = this.forceEncounters[channelId];
            const encounter = this.encounterBuilder
                .build(partyBiome, quest.getCharacters(), narrator, forceType);
            await quest.startEncounter(encounter);
        }
    }

    private validateTravelDirection(guildId: string, channelId: string, direction: Direction) {
        const world = this.worlds[guildId];
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const coordinates = quest.getPartyCoordinates();

        try {
            // Apply the cardinal direction to the party's coordinates, this method
            // throws an error if the delta would move the party off the world
            const [x, y] = world.applyDirectionToCoordinates(direction, coordinates);
            return [x, y];
        } catch (err) {
            throw new Error(`You cannot travel further ${direction}.`);
        }
    }

    private async handleTravel(interaction: CommandInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        // TODO: Probably need a better way to handle difference between a quest
        // being created and a quest being started.
        if (!quest.areAllCharactersCreated()) {
            throw new Error("The questing party hasn't formed yet!");
        }

        const world = this.worlds[guildId];
        const narrator = quest.getNarrator();
        // Travel can only happen between encounters, or if the encounter is a RestEncounter
        if (quest.isInEncounter() && !(quest.encounter instanceof FreeEncounter)) {
            await interaction.reply({
                content: "You cannot travel during an encounter.",
                ephemeral: true
            });
        } else {
            const direction = interaction.options.getString("direction", true) as Direction;
            try {
                this.validateTravelDirection(guildId, channelId, direction);
            } catch (err) {
                if (err instanceof Error) {
                    await interaction.reply({ content: err.message, ephemeral: true });
                }
                return;
            }

            const pollBooth = quest.getPollBooth();

            // We can reply here, since we don't reply in the result callback
            await interaction.reply({
                content: `You voted to travel '${direction}'!`,
                ephemeral: true
            });

            const voterId = interaction.user.id;
            await pollBooth.castVote(
                voterId,
                PollType.Travel,
                direction,
                async (vote: Direction) => {
                    const coordinates = quest.getPartyCoordinates();
                    // Store current biome string in a variable for use
                    const biome = world.getBiome(coordinates);

                    const [x, y] = this.validateTravelDirection(guildId, channelId, vote);

                    // If traveling from a free encounter, end that encounter
                    if (quest.encounter instanceof FreeEncounter) {
                        // TODO: This means we can never get XP from a FreeEncounter, because
                        // we never get its results before ending it. Probably need to fix that.
                        await quest.endEncounter();
                    }

                    // Set the new coordinates, and continue
                    quest.setPartyCoordinates([x, y]);

                    const newBiome = world.getBiome([x, y]);
                    await narrator.ponderAndDescribe(`The party chooses to travel ${vote}.`);
                    await narrator.describeTravel(biome, newBiome);

                    // Now that the party has reached a new location, start the next encounter
                    const forceType = this.forceEncounters[channelId];
                    const encounter = this.encounterBuilder
                        .build(newBiome, quest.getCharacters(), narrator, forceType);
                    await quest.startEncounter(encounter);
                }
            );
        }
    }

    private async handleSneak(interaction: CommandInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        quest.validateEncounterCommand(interaction);

        const pollBooth = quest.getPollBooth();
        const stealthAction = interaction.options.getSubcommand();

        // We can reply here, since we don't reply in the result callback
        await interaction.reply({
            content: `You voted to '${stealthAction}'!`,
            ephemeral: true
        });

        await pollBooth.castVote(
            interaction.user.id,
            PollType.Stealth,
            stealthAction,
            async (vote: string) => {
                const command = quest.validateEncounterCommand(interaction, vote);
                const results = await quest.handleEncounterCommand(interaction, command);
                await this.handleEncounterResults(guildId, channelId, results);
            }
        );
    }

    private async handleSurprise(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        quest.validateEncounterCommand(interaction);

        const pollBooth = quest.getPollBooth();
        const stealthAction = interaction.options.getSubcommand();

        // We can reply here, since we don't reply in the result callback
        await interaction.reply({
            content: `You voted to '${stealthAction}'!`,
            ephemeral: true
        });

        await pollBooth.castVote(
            interaction.user.id,
            PollType.Stealth,
            stealthAction,
            async (vote: string) => {
                const command = quest.validateEncounterCommand(interaction, vote);
                await quest.handleEncounterCommand(interaction, command);

                if (!quest.isInEncounter() || !(quest.encounter instanceof StealthEncounter)) {
                    throw new Error("Invalid stealth encounter, aborting");
                }

                const characters = quest.getCharacters();
                const narrator = quest.getNarrator();
                // Get monsters from the surprise encounter, add them to a combat encounter
                const { monsters } = quest.encounter;
                const cmbEncounter = new CombatEncounter(characters, narrator, monsters);

                // End the stealth encounter
                await quest.endEncounter();
                // Start the combat encounter
                await quest.startEncounter(cmbEncounter);
            }
        );
    }

    private async handleTalk(interaction: CommandInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        quest.validateEncounterCommand(interaction);

        const pollBooth = quest.getPollBooth();
        const socialAction = interaction.options.getSubcommand();

        // We can reply here, since we don't reply in the result callback
        await interaction.reply({
            content: `You voted to '${socialAction}'!`,
            ephemeral: true
        });

        await pollBooth.castVote(
            interaction.user.id,
            PollType.Social,
            socialAction,
            async (vote: string) => {
                const command = quest.validateEncounterCommand(interaction, vote);
                const results = await quest.handleEncounterCommand(interaction, command);
                await this.handleEncounterResults(guildId, channelId, results);
            }
        );
    }

    private async handleIgnore(interaction: CommandInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        quest.validateEncounterCommand(interaction);

        const pollBooth = quest.getPollBooth();
        const socialAction = interaction.options.getSubcommand();

        // We can reply here, since we don't reply in the result callback
        await interaction.reply({
            content: `You voted to '${socialAction}'!`,
            ephemeral: true
        });

        await pollBooth.castVote(
            interaction.user.id,
            PollType.Social,
            socialAction,
            async (vote: string) => {
                const command = quest.validateEncounterCommand(interaction, vote);
                const results = await quest.handleEncounterCommand(interaction, command);
                await this.handleEncounterResults(guildId, channelId, results);
            }
        );
    }

    private async promptBuy(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const command = quest.validateEncounterCommand(interaction);
        await quest.handleEncounterCommand(interaction, command);
    }

    private async handleBuy(interaction: SelectMenuInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const results = await quest.handleEncounterMenuSelect(interaction);
        await this.handleEncounterResults(guildId, channelId, results);
    }

    private async promptSell(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const command = quest.validateEncounterCommand(interaction);
        await quest.handleEncounterCommand(interaction, command);
    }

    private async handleSell(interaction: SelectMenuInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const results = await quest.handleEncounterMenuSelect(interaction);
        await this.handleEncounterResults(guildId, channelId, results);
    }

    // TODO: This would be an example of a command anyone can do that doesn't require
    // a poll to be executed. We need a way to lock this command until it resolves so
    // submissions by multiple users don't cause a race condition.
    private async handleLookout(interaction: CommandInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const command = quest.validateEncounterCommand(interaction);
        const results = await quest.handleEncounterCommand(interaction, command);

        await this.handleEncounterResults(guildId, channelId, results);
    }

    private async promptUse(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        // For using items, we only really validate it during an encounter
        if (quest.isInEncounter()) {
            // Override the command name here since typical encounter commands are
            // subcommands of /action
            const command = quest.validateEncounterCommand(interaction, interaction.commandName);
            await quest.handleEncounterCommand(interaction, command);
        // Otherwise, let them use items to their heart's content
        } else {
            // TODO: This code is a copy of what is in the base CombatEncounter 'commands' list,
            // we should avoid repeating it here.
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription("Which item are you using?");
            const pc = quest.assertAndGetPlayerCharacter(interaction.user.id);
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
    }

    private async handleUse(interaction: SelectMenuInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        if (quest.isInEncounter()) {
            const results = await quest.handleEncounterMenuSelect(interaction);
            await this.handleEncounterResults(guildId, channelId, results);
        } else {
            // TODO: This code is a copy of what is in the base CombatEncounter 'menus' list,
            // we should avoid repeating it here.
            const item = interaction.values[0];
            const pc = quest.assertAndGetPlayerCharacter(interaction.user.id);
            try {
                pc.getCharacter().useItem(item);
            } catch (err) {
                await interaction.reply({
                    content: "You do not have this item!",
                    ephemeral: true
                });
                return;
            }
            const narrator = quest.getNarrator();
            await narrator.ponderAndUpdate(interaction, {
                content: `You use the ${item}.`,
                components: [],
                embeds: []
            });
        }
    }

    private async handleMove(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        // Movement only allowed for now during an encounter
        if (quest.isInEncounter()) {
            const command = quest.validateEncounterCommand(interaction, interaction.commandName);
            await quest.handleEncounterCommand(interaction, command);
        } else {
            throw new Error("Invalid quest state for movement, aborting");
        }
    }

    private async promptAttack(interaction: CommandInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const command = quest.validateEncounterCommand(interaction);
        const results = await quest.handleEncounterCommand(interaction, command);

        await this.handleEncounterResults(guildId, channelId, results);
    }

    private async handleAttack(interaction: SelectMenuInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const results = await quest.handleEncounterMenuSelect(interaction);

        await this.handleEncounterResults(guildId, channelId, results);
    }

    private async promptCastSpell(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const command = quest.validateEncounterCommand(interaction);
        await quest.handleEncounterCommand(interaction, command);
    }

    private async handleCastSpell(interaction: SelectMenuInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const results = await quest.handleEncounterMenuSelect(interaction);

        await this.handleEncounterResults(guildId, channelId, results);
    }

    private async handleSpellTarget(interaction: SelectMenuInteraction): Promise<void> {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const results = await quest.handleEncounterMenuSelect(interaction);

        await this.handleEncounterResults(guildId, channelId, results);
    }

    private async displayInventory(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const pc = quest.assertAndGetPlayerCharacter(interaction.user.id);

        const quantities = pc.getCharacter().getInventory().getQuantities();
        const description = quantities.length
            ? `${Object.keys(quantities).length} / ${Inventory.MAX_SIZE}`
            : "Inventory is empty";
        const fields = quantities.map((q) => ({
            name: q.item.name,
            value: q.quantity.toString(),
            inline: true
        }));
        const thumbnail = new AttachmentBuilder("assets/inventory.png");
        const embed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Your inventory")
            .setAuthor({ name: description })
            .setThumbnail("attachment://inventory.png")
            .addFields(fields);
        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
            files: [thumbnail]
        });
    }

    private async displayStatus(interaction: CommandInteraction): Promise<void> {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        const pc = quest.assertAndGetPlayerCharacter(interaction.user.id);

        const className = pc.getCharacter().baseId;
        const thumbnail = new AttachmentBuilder(`assets/${className}.png`);
        const embed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(pc.getName())
            .setDescription(`Level ${pc.lvl} ${className}`)
            .setThumbnail(`attachment://${className}.png`)
            .addFields(
                {
                    name: "Hitpoints",
                    value: `${pc.getCharacter().hp} / ${pc.getCharacter().maxHp}`
                }
            );
        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
            files: [thumbnail]
        });
    }

    private async displayLocalMap(interaction: CommandInteraction) {
        const { guildId, channelId } = interaction;
        this.assertQuestStarted(channelId);

        const world = this.worlds[guildId];
        const quest = this.quests[channelId];

        const map = world.stringify(quest.getPartyCoordinates());
        console.info(map);

        const localMap = world.stringifyLocal(quest.getPartyCoordinates());
        await interaction.reply({
            content: localMap,
            ephemeral: true
        });
    }

    /* OTHER METHODS */

    private async failQuest(channelId: string): Promise<void> {
        const quest = this.quests[channelId];
        const narrator = quest.getNarrator();
        await narrator.ponderAndDescribe(
            "*Your party was slaughtered, and so ends this thread of destiny...*"
        );
        delete this.quests[channelId];
        delete this.forceEncounters[channelId];
    }

    private async promptTravel(guildId: string, channelId: string) {
        this.assertQuestStarted(channelId);

        const world = this.worlds[guildId];
        const quest = this.quests[channelId];

        // Describe surroundings
        const narrator = quest.getNarrator();
        const partyBiome = world.getBiome(quest.getPartyCoordinates());
        await narrator.describeSurroundings(partyBiome);
        await narrator.ponderAndDescribe("Where would you like to go? Use **/travel** to "
            + "choose a direction.");
    }

    private async awardExperience(channelId: string, xpReward: number) {
        this.assertQuestStarted(channelId);
        const quest = this.quests[channelId];

        const narrator = quest.getNarrator();
        await narrator.ponderAndDescribe(`The party is awarded ${xpReward} XP.`);

        const party = quest.getPlayerCharacters();
        for (const userId in party) {
            const pc = party[userId];
            const newLvl = pc.gainXp(xpReward);
            if (newLvl) {
                await narrator.ponderAndDescribe(`${pc.getName()} is now level ${newLvl}!`);
            }
        }
    }

    private async handleEncounterResults(
        guildId: string,
        channelId: string,
        results?: EncounterResults
    ) {
        // If results are undefined, it means encounter did not end
        if (results === undefined) {
            return;
        }
        // If there are results, encounter is over
        this.assertQuestStarted(channelId);
        const quest = this.quests[channelId];
        await quest.endEncounter();
        // If success, continue quest
        if (results.success) {
            // Award XP from encounter results to party
            await this.awardExperience(channelId, results.xp);
            await this.promptTravel(guildId, channelId);
        // If not success, quest ends
        } else {
            await this.failQuest(channelId);
        }
    }

    /* DEBUG */

    private async forceFailQuest(interaction: CommandInteraction) {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];
        console.info(`Forcing quest '${quest.id}' to end...`);

        await interaction.reply({
            content: "Killing the heroes and ending the quest...",
            ephemeral: true
        });

        await this.failQuest(channelId);
    }

    private async forceEncounterType(interaction: CommandInteraction) {
        const { channelId } = interaction;
        this.assertQuestStarted(channelId);

        const quest = this.quests[channelId];

        const encounterType = interaction.options.getString("type") as EncounterType;
        let content = "";
        if (!encounterType) {
            content = "Removing forced encounter type for quest...";
            console.info(`Removing forced encounter type for quest '${quest.id}'...`);
            delete this.forceEncounters[channelId];
        } else {
            content = `Setting forced encounter type to '${encounterType}'`;
            console.info(`Forcing '${encounterType}' encounters for quest '${quest.id}'...`);
            this.forceEncounters[channelId] = encounterType;
        }

        await interaction.reply({ content, ephemeral: true });
    }
}
