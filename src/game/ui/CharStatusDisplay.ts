import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import PlayerCharacter from "../PlayerCharacter";
import { defaultXpService } from "../../services/ExperienceCalculator";

export default function CharStatusDisplay(pc: PlayerCharacter) {
    const className = pc.getCharacter().baseId;
    const xpToLvl = defaultXpService.getExperienceForNextLevel(pc.lvl);

    const equipmentTextDisplay = [];
    const equipment = pc.getEquipment();
    if (equipment.weapon) {
        equipmentTextDisplay.push(`Weapon: *${equipment.weapon.name}*`);
    }
    if (equipment.offhand) {
        equipmentTextDisplay.push(`Offhand: *${equipment.offhand.name}*`);
    }
    if (equipment.body) {
        equipmentTextDisplay.push(`Body: *${equipment.body.name}*`);
    }
    if (equipment.helm) {
        equipmentTextDisplay.push(`Helm: *${equipment.helm.name}*`);
    }
    if (equipment.boots) {
        equipmentTextDisplay.push(`Boots: *${equipment.boots.name}*`);
    }
    if (equipment.cape) {
        equipmentTextDisplay.push(`Cape: *${equipment.cape.name}*`);
    }
    const container = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(`# ${pc.getName()}`))
        .addSeparatorComponents(separator => separator)
        .addSectionComponents((section) =>
            section.addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`### :bar_chart: Level ${pc.lvl} ${className}`),
            (textDisplay) => textDisplay.setContent(
                `### :fireworks: *${pc.xp} / ${xpToLvl}* xp to level`),
            (textDisplay) => textDisplay.setContent(`### :hammer_pick: ${pc.profession.name}`))
                .setThumbnailAccessory((thumbnail) =>
                    thumbnail
                        .setURL(`attachment://${className}.png`)
                        .setDescription(`alt text ${className}`)))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `### :heart: *${pc.getCharacter().hp} / ${pc.getCharacter().maxHp}*`))
        .addSeparatorComponents(separator => separator)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent("### :crossed_swords: Equipment"),
        ...equipmentTextDisplay.map(d =>
            (textDisplay: TextDisplayBuilder) => textDisplay.setContent(d))
        );
    return container;
}
