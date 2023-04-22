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
                await this.logMapDisplay(interaction);
            }
        } catch (err) {
            console.error(`Failed to process '/${interaction.commandName}' command `
                + "due to:", err);
            if (!interaction.replied) {
                await interaction.reply({
                    content: "Failed to handle command, please try again later.",
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
            console.error(`Failed to process selection for '${interaction.customId}' `
                + "due to:", err);
            await interaction.update({
                content: "Failed to handle selection, please try again.",
            });
        }
    }

    // Actions are all things that can be done during encounters, or that have special
    // rules during encounters
    private async handleAction(interaction: CommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();
        try {
            const guildId = interaction.guildId;
            this.assertQuestStarted(guildId);

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
            }
        }
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
        const questChannel = interaction.options.getChannel("channel") || interaction.channel;
        if (!(questChannel instanceof TextChannel)) {
            throw new Error(`Invalid channel '${questChannel.id}' of type '${questChannel.type}'`);
        }
        const narrator = new Narrator(guildId, questChannel);

        // Create quest for user(s)
        const userIds = players.map(p => p.id);
        const quest = new Quest(guildId, userIds, narrator);
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

            const encounter = this.encounterBuilder
                .build(partyBiome, quest.getCharacters(), narrator);
            await quest.startEncounter(encounter);
        }
    }

    private validateTravelDirection(guildId: string, direction: Direction) {
        const world = this.worlds[guildId];
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
                this.validateTravelDirection(guildId, direction);
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

                    const [x, y] = this.validateTravelDirection(guildId, vote);

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
                    const encounter = this.encounterBuilder
                        .build(newBiome, quest.getCharacters(), narrator);
                    await quest.startEncounter(encounter);
                }
            );
        }
    }

    private async handleSneak(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
                await this.handleEncounterResults(guildId, results);
            }
        );
    }

    private async handleSurprise(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
                await this.handleEncounterResults(guildId, results);
            }
        );
    }

    private async handleTalk(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
                await this.handleEncounterResults(guildId, results);
            }
        );
    }

    private async handleIgnore(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
                await this.handleEncounterResults(guildId, results);
            }
        );
    }

    private async promptBuy(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const command = quest.validateEncounterCommand(interaction);
        await quest.handleEncounterCommand(interaction, command);
    }

    private async handleBuy(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const results = await quest.handleEncounterMenuSelect(interaction);
        await this.handleEncounterResults(guildId, results);
    }

    private async promptSell(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const command = quest.validateEncounterCommand(interaction);
        await quest.handleEncounterCommand(interaction, command);
    }

    private async handleSell(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const results = await quest.handleEncounterMenuSelect(interaction);
        await this.handleEncounterResults(guildId, results);
    }

    // TODO: This would be an example of a command anyone can do that doesn't require
    // a poll to be executed. We need a way to lock this command until it resolves so
    // submissions by multiple users don't cause a race condition.
    private async handleLookout(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const command = quest.validateEncounterCommand(interaction);
        const results = await quest.handleEncounterCommand(interaction, command);

        await this.handleEncounterResults(guildId, results);
    }

    private async promptUse(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        if (quest.isInEncounter()) {
            const results = await quest.handleEncounterMenuSelect(interaction);
            await this.handleEncounterResults(guildId, results);
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

    private async promptAttack(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const command = quest.validateEncounterCommand(interaction);
        const results = await quest.handleEncounterCommand(interaction, command);

        await this.handleEncounterResults(guildId, results);
    }

    private async handleAttack(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const results = await quest.handleEncounterMenuSelect(interaction);

        await this.handleEncounterResults(guildId, results);
    }

    private async promptCastSpell(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const command = quest.validateEncounterCommand(interaction);
        await quest.handleEncounterCommand(interaction, command);
    }

    private async handleCastSpell(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterMenuSelect(interaction);
    }

    private async handleSpellTarget(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const results = await quest.handleEncounterMenuSelect(interaction);

        await this.handleEncounterResults(guildId, results);
    }

    private async displayInventory(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
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

    private async logMapDisplay(interaction: CommandInteraction) {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const world = this.worlds[guildId];
        const quest = this.quests[guildId];

        const map = world.stringify(quest.getPartyCoordinates());
        console.info(map);
        await interaction.reply({
            content: "Printed map to the console.",
            ephemeral: true
        });
    }

    /* OTHER METHODS */

    private async failQuest(guildId: string): Promise<void> {
        const quest = this.quests[guildId];
        const narrator = quest.getNarrator();
        await narrator.ponderAndDescribe(
            "*Your party was slaughtered, and so ends this thread of destiny...*"
        );
        delete this.quests[guildId];
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

    private async awardExperience(guildId: string, xpReward: number) {
        this.assertQuestStarted(guildId);
        const quest = this.quests[guildId];

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

    private async handleEncounterResults(guildId: string, results?: EncounterResults) {
        // If results are undefined, it means encounter did not end
        if (results === undefined) {
            return;
        }
        // If there are results, encounter is over
        this.assertQuestStarted(guildId);
        const quest = this.quests[guildId];
        await quest.endEncounter();
        // If success, continue quest
        if (results.success) {
            // Award XP from encounter results to party
            await this.awardExperience(guildId, results.xp);
            await this.promptTravel(guildId);
        // If not success, quest ends
        } else {
            await this.failQuest(guildId);
        }
    }
}
