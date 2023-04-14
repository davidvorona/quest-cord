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
import { getPlayersFromStartCommand, isEmpty, sendMissingPermissionsMessage } from "../util";
import Quest from "./Quest";
import World from "./World";
import Narrator from "./Narrator";
import SpellFactory from "../services/SpellFactory";
import FreeEncounter from "./encounters/FreeEncounter";

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
            if (!QuestLord.isValidInteraction(interaction)) return;

            // Choosing a target to attack
            if (interaction.customId === "target") {
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
            if (subcommand === "cast") {
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

            const encounter = this.encounterBuilder
                .build(partyBiome, quest.getCharacters(), narrator);
            await quest.startEncounter(encounter);
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

            // If traveling from a free encounter, end that encounter
            if (quest.encounter instanceof FreeEncounter) {
                await quest.endEncounter();
            }

            // Set the new coordinates, and continue
            quest.setPartyCoordinates([x, y]);

            const newBiome = world.getBiome([x, y]);
            await narrator.ponderAndReply(interaction, `You choose to travel ${direction}.`);
            await narrator.describeTravel(biome, newBiome);

            // Now that the party has reached a new location, start the next encounter
            const encounter = this.encounterBuilder
                .build(newBiome, quest.getCharacters(), narrator);
            await quest.startEncounter(encounter);
        }
    }

    private async handleSneak(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterCommand(interaction);

        if (!quest.isInEncounter()) {
            await this.promptTravel(guildId);
        }
    }

    private async handleSurprise(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterCommand(interaction);

        if (!quest.isInEncounter()) {
            await this.promptTravel(guildId);
        }
    }

    private async handleTalk(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterCommand(interaction);

        if (!quest.isInEncounter()) {
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
    }

    private async handleSell(interaction: SelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterMenuSelect(interaction);

        if (!quest.isInEncounter()) {
            await this.promptTravel(guildId);
        }
    }

    private async handleLookout(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        await quest.handleEncounterCommand(interaction);

        if (!quest.isInEncounter()) {
            await this.promptTravel(guildId);
        }
    }

    private async printInventory(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        const pc = quest.assertAndGetPlayerCharacter(interaction.user.id);
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
        await interaction.reply({
            content: "Printed status to the console.",
            ephemeral: true
        });
    }

    private async logMapDisplay(interaction: CommandInteraction) {
        const guildId = interaction.guildId;
        const world = this.worlds[guildId];
        const quest = this.quests[guildId];

        const map = world.stringify(quest.getPartyCoordinates());
        console.info(map);
        await interaction.reply({
            content: "Printed map to the console.",
            ephemeral: true
        });
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

    private async handleEncounterResults(guildId: string, results?: boolean) {
        // If results are undefined, it means encounter did not end
        if (results === undefined) {
            return;
        }
        // results === true is success, continue quest
        if (results) {
            await this.promptTravel(guildId);
        // results === false is failure, and quest ends
        } else {
            await this.failQuest(guildId);
        }
    }

    private async promptUse(interaction: CommandInteraction): Promise<void> {
        const guildId = interaction.guildId;
        this.assertQuestStarted(guildId);

        const quest = this.quests[guildId];
        // For using items, we only really validate it during an encounter
        if (quest.isInEncounter()) {
            // Override the command name here since typical encounter commands are
            // subcommands of /action
            await quest.handleEncounterCommand(interaction, interaction.commandName);
        // Otherwise, let them use items to their heart's content
        } else {
            // TODO: This code is a copy of what is in the base Encounter 'commands' list,
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
        await quest.handleEncounterCommand(interaction);
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
        await quest.handleEncounterCommand(interaction);
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
}
