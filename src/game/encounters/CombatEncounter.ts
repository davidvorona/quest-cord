import TurnBasedEncounter from "./TurnBasedEncounter";
import Character from "../creatures/Character";
import Monster from "../creatures/Monster";
import { rand, shuffleArray } from "../../util";
import Creature from "../creatures/Creature";
import Narrator from "../Narrator";
import { CommandInteraction, SelectMenuInteraction } from "../../types";
import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";

export default class CombatEncounter extends TurnBasedEncounter {
    monsters: Monster[] = [];

    /**
     * The heldSpell property is the ID of the spell selected in the
     * 'spell:cast' command, temporarily cached until the user chooses
     * a target. There can only ever be one, since a single user can
     * only hold one spell, and combat encounters are turn-based.
     */
    heldSpell?: string;

    static commands = [
        {
            name: "attack",
            description: "Strike at an enemy!"
        },
        {
            name: "cast",
            description: "Cast a spell"
        }
    ];

    commands = {
        attack: {
            execute: async (interaction: CommandInteraction) => {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("Who do you want to attack?");
                const options = this.getMonsterNames().map((n: string, idx) => ({
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
                await this.narrator.reply(interaction, {
                    ephemeral: true,
                    embeds: [embed],
                    components: [row]
                });
            }
        },
        cast: {
            execute: async (interaction: CommandInteraction, character: Character) => {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("What spell do you want to cast?");
                const options = character.getSpells().map(s => ({
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
                    await this.narrator.reply(interaction, {
                        ephemeral: true,
                        embeds: [embed],
                        components: [row]
                    });
                } else {
                    throw new Error("You do not have any spells!");
                }
            }
        },
        use: {
            execute: async (interaction: CommandInteraction, character: Character) => {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("Which item are you using?");
                const options = character.getInventory().getInteractionOptions();
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("item:use")
                            .setPlaceholder("Nothing selected")
                            .addOptions(options)
                    );
                await this.narrator.reply(interaction, {
                    ephemeral: true,
                    embeds: [embed],
                    components: [row]
                });
            }
        }
    };

    menus = [
        {
            customId: "target",
            consumesTurn: true,
            execute: async (interaction: SelectMenuInteraction, character: Character) => {
                const targetIdx = Number(interaction.values[0]);

                const target = this.getMonsterByIndex(targetIdx);

                await this.narrator.update(interaction, {
                    content: "You prepare to attack the creature...",
                    components: [],
                    embeds: []
                });

                const damage = this.calculateDamage(character);
                target.setHp(target.hp - damage);

                await this.narrator.describeAttack(character, target, damage);
            }
        },
        {
            customId: "spell:cast",
            execute: async (interaction: SelectMenuInteraction, character: Character) => {
                const spellId = interaction.values[0];
                const spell = character.getSpell(spellId);
                if (!spell) {
                    throw new Error("You do not have this spell, aborting");
                }
                this.holdSpell(spellId);

                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription(`You choose to cast **${spell.name}**. `
                        + "Who do you want to target?");
                const options = this.getMonsterNames().map((n: string, idx) => ({
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
                await this.narrator.ponderAndUpdate(interaction, {
                    components: [row],
                    embeds: [embed]
                });
            }
        },
        {
            customId: "spell:target",
            consumesTurn: true,
            execute: async (interaction: SelectMenuInteraction, character: Character) => {
                if (!this.heldSpell) {
                    throw new Error("You are not holding any spell!");
                }

                await this.narrator.ponderAndUpdate(interaction, {
                    content: "You prepare to cast the spell...",
                    embeds: [],
                    components: []
                });

                const heldSpell = character.getSpell(this.heldSpell);
                if (!heldSpell) {
                    throw new Error("You are not holding this spell...");
                }

                // TODO: Actually apply the spell to the game LOL
                await this.narrator.describeCastSpell(character, heldSpell);

                this.releaseSpell();
            }
        },
        {
            customId: "item:use",
            consumesTurn: true,
            execute: async (interaction: SelectMenuInteraction, character: Character) => {
                const item = interaction.values[0];
                try {
                    character.useItem(item);
                } catch (err) {
                    await this.narrator.reply(interaction, {
                        content: "You do not have this item!",
                        ephemeral: true
                    });
                    return;
                }
                await this.narrator.ponderAndUpdate(interaction, {
                    content: `You use the ${item}.`,
                    components: [],
                    embeds: []
                });
            }
        }
    ];

    constructor(characters: Character[], narrator: Narrator, monsters: Monster[]) {
        super(characters, narrator);
        this.monsters = monsters;
        this.narrator = narrator;
        this.turnOrder = shuffleArray([...characters, ...monsters]);
        console.info(
            "Combat encounter started...",
            this.getCharacterNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterByIndex(index: number): Monster {
        return this.monsters[index];
    }

    getMonsterNames = () => this.monsters.map(m => m.getName());

    getTotalCharacterHp = () => this.characters.reduce((acc, curr) => acc + curr.hp, 0);

    getTotalMonsterHp = () => this.monsters.reduce((acc, curr) => acc + curr.hp, 0);

    isOver = () => !this.getTotalCharacterHp() || !this.getTotalMonsterHp();

    isSuccess = () => !this.getTotalMonsterHp();

    private holdSpell(spellId: string) {
        this.heldSpell = spellId;
    }

    private releaseSpell() {
        this.heldSpell = undefined;
    }

    /**
     * @override
     */
    async handleNextTurn() {
        await super.handleNextTurn();
        this.releaseSpell();
    }

    /**
     * @override
     */
    async handleTurn() {
        const currentTurn = this.getCurrentTurn();
        await this.narrator.ponderAndDescribe(`It is ${currentTurn.getName()}'s turn.`);
        // If its a monster's turn, invoke its handler
        if (currentTurn instanceof Monster) {
            await this.handleMonsterTurn();
        }
    }

    private async handleMonsterTurn() {
        const currentTurn = this.getCurrentTurn();
        if (currentTurn instanceof Monster) {
            const chars = this.getCharacters();
            const target = chars[rand(chars.length)];
            const damage = this.calculateDamage(currentTurn);
            target.setHp(target.hp - damage);
            await this.narrator.ponderAndDescribe(`${currentTurn.getName()} deals ${damage} damage `
                + `to ${target.getName()}.`);
            await this.handleNextTurn();
        }
    }

    calculateDamage(attacker: Creature): number {
        const baseDamage = attacker.damage;
        const weapon = attacker.getWeapon();
        const weaponDamage = weapon ? weapon.damage : 0;
        return baseDamage + weaponDamage;
    }
}
