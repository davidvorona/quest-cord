import { ContainerBuilder, MessageFlags } from "discord.js";

import { ButtonPressInteraction } from "../../../types";
import Character from "../../creatures/Character";
import FreeEncounter from "../FreeEncounter";
import Narrator from "../../Narrator";
import { RestButton } from "../../actions";
import { EncounterType } from "../../../constants";

export default class RestEncounter extends FreeEncounter {
    type = EncounterType.Rest;
    description = "Taking a rest... :zzz:";

    handlePlayerRest = async (interaction: ButtonPressInteraction, character: Character) => {
        const previousHp = character.hp;
        character.setHp(character.maxHp);
        const container = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`# + ${character.hp - previousHp} :sparkling_heart:`))
            .addSeparatorComponents(separator => separator)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent("You restore your health from "
                    + `**${previousHp}** to **${character.hp}**.`));
        await this.narrator.reply(interaction, {
            components: [container],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    };

    buttons = {
        rest: new RestButton(this.handlePlayerRest),
    };

    constructor(characters: Character[], narrator: Narrator) {
        super(characters, narrator);
        console.info(
            "Rest encounter started...",
            this.getCharacterNames()
        );
    }
}
