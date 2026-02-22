import { ButtonPressInteraction, CharacterClass, CommandInteraction } from "../types";
import CompendiumReader from "./CompendiumReader";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags
} from "discord.js";
import Item from "../game/things/Item";

enum CharacterCreatorStep {
    ClassSelection = 0,
    ProfessionSelection = 1,
    GiftSelection = 2,
    // NameSelection = 3,
    Confirmation = 3
}

export default class CharacterCreator {
    compendium: CompendiumReader;

    step: CharacterCreatorStep = CharacterCreatorStep.ClassSelection;

    classIdx = 0;

    professionIdx = 0;

    gifts: Item[] = [];
    startingGiftIdx = 0;

    name?: string;

    constructor(compendium: CompendiumReader) {
        this.compendium = compendium;

        const giftItemIds = ["elixir", "potion", "old_key"];
        const items: Record<string, Item> = this.compendium.data.items;
        const gifts = giftItemIds.map(id => items[id]);
        // Patch in gold as an item
        gifts.push(new Item({
            name: "10 gold",
            id: "10gp",
            type: "treasure",
            value: 10,
            description: "It's gold. What more do you want?"
        }));
        this.gifts = gifts;
    }

    async showStep(interaction: CommandInteraction | ButtonPressInteraction, init = false) {
        switch (this.step) {
        case CharacterCreatorStep.ClassSelection: {
            const classes: Record<string, CharacterClass> = this.compendium.data.classes;

            const showcaseClass = Object.values(classes)[this.classIdx];
            const file = new AttachmentBuilder(`assets/${showcaseClass.id}.png`);

            const weaponId = showcaseClass.equipment.weapon;
            const weaponItem = weaponId ? this.compendium.data.items[weaponId] : null;

            const spells = showcaseClass.spells?.map(
                spellId => this.compendium.data.spells[spellId]);

            const container = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("# Pick a class (Step 1 of 4)"))
                .addSeparatorComponents(separator => separator)
                .addSectionComponents((section) =>
                    section.addTextDisplayComponents((textDisplay) =>
                        textDisplay.setContent(`## ${showcaseClass.name}`))
                        .setButtonAccessory(button => button
                            .setCustomId("next-class")
                            .setLabel("Next")
                            .setStyle(ButtonStyle.Primary)))
                .addSeparatorComponents(separator => separator)
                .addSectionComponents((section) =>
                    section.addTextDisplayComponents((textDisplay) =>
                        textDisplay.setContent(`Hitpoints: **${showcaseClass.hp}**`),
                    (textDisplay) => textDisplay
                        .setContent(`Base damage: **${showcaseClass.damage}**`))
                        .setThumbnailAccessory((thumbnail) =>
                            thumbnail
                                .setURL(`attachment://${showcaseClass.id}.png`)
                                .setDescription(`alt text ${showcaseClass.name}`)))
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        `Weapon: **${weaponItem?.name}** (+${weaponItem?.damage})`),
                (textDisplay) => textDisplay.setContent(
                    `Spells: **${spells?.map(spell => spell.name).join(", ") || "None"}**`));
            if (init) {
                await interaction.reply({
                    components: [container, this.getButtons()],
                    files: [file],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                });
            } else {
                const buttonInteraction = interaction as ButtonPressInteraction;
                await buttonInteraction.update({
                    components: [container, this.getButtons()],
                    files: [file],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            break;
        }
        case CharacterCreatorStep.ProfessionSelection: {
            const professions = this.compendium.data.professions;
            const showcaseProfession = Object.values(professions)[this.professionIdx];

            const buttonInteraction = interaction as ButtonPressInteraction;
            const container = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("# Pick a profession (Step 2 of 4)"))
                .addSeparatorComponents(separator => separator)
                .addSectionComponents((section) =>
                    section.addTextDisplayComponents((textDisplay) =>
                        textDisplay.setContent(`## ${showcaseProfession.name}`))
                        .setButtonAccessory(button => button
                            .setCustomId("next-profession")
                            .setLabel("Next")
                            .setStyle(ButtonStyle.Primary)))
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(showcaseProfession.description));
            await buttonInteraction.update({
                components: [container, this.getButtons()],
                flags: MessageFlags.IsComponentsV2
            });
            break;
        }
        case CharacterCreatorStep.GiftSelection: {
            const createGiftSection = (containerBuilder: ContainerBuilder, giftIdx: number) => {
                const gift = this.gifts[giftIdx];
                if (giftIdx === this.startingGiftIdx) {
                    return containerBuilder
                        .addTextDisplayComponents((textDisplay) =>
                            textDisplay.setContent(`## :white_check_mark: ${gift.name}`),
                        (textDisplay) => textDisplay.setContent(
                            gift.description || "A special gift from the gods."))
                        .addSeparatorComponents(separator => separator);
                }
                const container = containerBuilder
                    .addSectionComponents((section) =>
                        section.addTextDisplayComponents((textDisplay) =>
                            textDisplay.setContent(`## ${gift.name}`))
                            .setButtonAccessory(button => button
                                .setCustomId(`choose-gift-${giftIdx}`)
                                .setLabel("Choose")
                                .setStyle(ButtonStyle.Primary)))
                    .addTextDisplayComponents((textDisplay) =>
                        textDisplay.setContent(gift.description || "A special gift."));
                if (giftIdx < this.gifts.length - 1) {
                    container.addSeparatorComponents(separator => separator);
                }
                return container;
            };

            const buttonInteraction = interaction as ButtonPressInteraction;
            const container = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("# Pick a gift (Step 3 of 4)"))
                .addSeparatorComponents(separator => separator);
            this.gifts.forEach((gift, idx) => {
                createGiftSection(container, idx);
            });
            await buttonInteraction.update({
                components: [container, this.getButtons()],
                flags: MessageFlags.IsComponentsV2
            });
            break;
        }
        case CharacterCreatorStep.Confirmation: {
            const buttonInteraction = interaction as ButtonPressInteraction;
            const gift = this.gifts[this.startingGiftIdx];
            const profession = Object.values(this.compendium.data.professions)[this.professionIdx];
            const charClass = Object.values(this.compendium.data.classes)[this.classIdx];
            const file = new AttachmentBuilder(`assets/${charClass.id}.png`);
            const container = new ContainerBuilder()
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("# Review your character (Step 4 of 4)"))
                .addSeparatorComponents(separator => separator)
                .addSectionComponents((section) =>
                    section.addTextDisplayComponents((textDisplay) =>
                        textDisplay.setContent("*Class*"),
                    (textDisplay) => textDisplay.setContent(`## ${charClass.name}`))
                        .setThumbnailAccessory((thumbnail) =>
                            thumbnail
                                .setURL(`attachment://${charClass.id}.png`)
                                .setDescription(`alt text ${charClass.name}`)))
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("*Profession*"),
                (textDisplay) => textDisplay.setContent(`## ${profession.name}`))
                .addSeparatorComponents(separator => separator)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent("*Gift*"),
                (textDisplay) => textDisplay.setContent(`## ${gift.name}`));
            await buttonInteraction.update({
                components: [container, this.getButtons()],
                flags: MessageFlags.IsComponentsV2,
                files: [file]
            });
            break;
        }
        default:
            break;
        }
    }

    getButtons() {
        const buttons = [];
        if (this.step > CharacterCreatorStep.ClassSelection) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId("char-creator-back")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        buttons.push(
            new ButtonBuilder()
                .setCustomId("char-creator-next")
                .setLabel(this.step === CharacterCreatorStep.Confirmation ? "Finalize" : "Continue")
                .setStyle(ButtonStyle.Success)
        );
        return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
    }

    nextStep() {
        this.step += 1;
    }

    prevStep() {
        this.step -= 1;
    }

    isAtFinalStep() {
        return this.step === CharacterCreatorStep.Confirmation;
    }

    getClass() {
        return Object.values(this.compendium.data.classes)[this.classIdx];
    }

    getClassId() {
        return this.getClass().id;
    }

    getProfession() {
        return Object.values(this.compendium.data.professions)[this.professionIdx];
    }

    getProfessionId() {
        return this.getProfession().id;
    }

    getStartingGiftId() {
        return this.gifts[this.startingGiftIdx].id;
    }

    nextClass() {
        if (this.step !== CharacterCreatorStep.ClassSelection) {
            throw new Error("Invalid step for nextClass, aborting");
        }
        if (this.classIdx >= Object.keys(this.compendium.data.classes).length - 1) {
            this.classIdx = 0;
        } else {
            this.classIdx += 1;
        }
    }

    nextProfession() {
        if (this.step !== CharacterCreatorStep.ProfessionSelection) {
            throw new Error("Invalid step for nextProfession, aborting");
        }
        if (this.professionIdx >= Object.keys(this.compendium.data.professions).length - 1) {
            this.professionIdx = 0;
        } else {
            this.professionIdx += 1;
        }
    }

    chooseGift(giftIdx: number) {
        if (this.step !== CharacterCreatorStep.GiftSelection) {
            throw new Error("Invalid step for nextGift, aborting");
        }
        this.startingGiftIdx = giftIdx;
    }
}
