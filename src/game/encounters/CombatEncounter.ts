import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder,
} from "discord.js";
import SmartCombatLog, { ATTACKER_IDX } from "../../services/SmartCombatLog";
import TurnBasedEncounter from "./TurnBasedEncounter";
import Character from "../creatures/Character";
import Monster from "../creatures/Monster";
import { rand, shuffleArray } from "../../util";
import Creature from "../creatures/Creature";
import Narrator from "../Narrator";
import {
    SpellCommand,
    AttackCommand,
    UseCommand,
    AttackSelection,
    SpellCastSelection,
    SpellTargetSelection,
    UseSelection,
} from "../actions";
import { CommandInteraction, SelectMenuInteraction } from "../../types";
import Action from "../actions/Action";

export default class CombatEncounter extends TurnBasedEncounter {
    monsters: Monster[] = [];

    combatLog: SmartCombatLog;

    /**
     * The heldSpell property is the ID of the spell selected in the
     * 'spell:cast' command, temporarily cached until the user chooses
     * a target. There can only ever be one, since a single user can
     * only hold one spell, and combat encounters are turn-based.
     */
    heldSpell?: string;

    commands = {
        attack: new AttackCommand(async (interaction: CommandInteraction, character: Character) => {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription("Who do you want to attack?");
            const options = this.getMonsterNames().map((n: string, idx) => ({
                label: n,
                value: idx.toString()
            }));
            if (options.length === 1) {
                const target = this.monsters[0];

                await this.narrator.reply(interaction, {
                    ephemeral: true,
                    content: "You prepare to attack the creature...",
                    components: [],
                    embeds: []
                });

                await this.handleAttack(character, target);
            } else {
                const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("attack")
                            .setPlaceholder("Nothing selected")
                            .addOptions(options)
                    );
                await this.narrator.reply(interaction, {
                    ephemeral: true,
                    embeds: [embed],
                    components: [row]
                });
            }
        }),
        spell: new SpellCommand(async (interaction: CommandInteraction, character: Character) => {
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
        }),
        use: new UseCommand(async (interaction: CommandInteraction, character: Character) => {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription("Which item are you using?");
            const options = character.getInventory().getInteractionOptions();
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("use")
                        .setPlaceholder("Nothing selected")
                        .addOptions(options)
                );
            await this.narrator.reply(interaction, {
                ephemeral: true,
                embeds: [embed],
                components: [row]
            });
        })
    };

    menus = [
        new AttackSelection(async (
            interaction: SelectMenuInteraction,
            character: Character
        ) => {
            const targetIdx = Number(interaction.values[0]);

            const target = this.getMonsterByIndex(targetIdx);

            await this.narrator.update(interaction, {
                content: "You prepare to attack the creature...",
                components: [],
                embeds: []
            });

            await this.handleAttack(character, target);
        }),
        new SpellCastSelection(async (interaction: SelectMenuInteraction, character: Character) => {
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
            if (options.length === 1) {
                await this.narrator.ponderAndUpdate(interaction, {
                    content: "You prepare to cast the spell...",
                    embeds: [],
                    components: []
                });

                // TODO: Actually apply the spell to the game LOL
                await this.narrator.describeCastSpell(character, spell);
            } else {
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
        }),
        new SpellTargetSelection(async (
            interaction: SelectMenuInteraction,
            character: Character
        ) => {
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
        }),
        new UseSelection(async (interaction: SelectMenuInteraction, character: Character) => {
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
        })
    ];

    constructor(characters: Character[], narrator: Narrator, monsters: Monster[]) {
        super(characters, narrator);
        this.monsters = monsters;
        this.narrator = narrator;
        this.turnOrder = shuffleArray([...characters, ...monsters]);
        this.combatLog = new SmartCombatLog(this.turnOrder);
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

    getXpReward = () => Math.max(this.monsters.length * 5, 10);

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
    isActionTurnConsuming(action: Action) {
        let result = super.isActionTurnConsuming(action);
        // If an attack command is issued and there's only one monster, we automatically
        // target the only monster and complete the turn
        if (action instanceof AttackCommand && this.monsters.length === 1) {
            result = true;
        // If a spell:cast selection is submitted and there's only one monster, we
        // automatically target the only monster and complete the turn
        } else if (action instanceof SpellCastSelection && this.monsters.length === 1) {
            result = true;
        }
        return result;
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
            const target = this.chooseTarget(currentTurn);
            await this.handleAttack(currentTurn, target);

            await this.handleNextTurn();
        }
    }

    private async handleAttack(attacker: Creature, target: Creature) {
        const damage = this.calculateDamage(attacker);
        target.setHp(target.hp - damage);

        const attackerIdx = this.getTurnOrderIdx(attacker);
        const targetIdx = this.getTurnOrderIdx(target);
        // Keep in mind, the combat log currently only records turns where
        // a player attacks, and ignores casting spells and using items
        this.combatLog.append(attackerIdx, targetIdx);

        await this.narrator.describeAttack(attacker, target, damage);
    }

    private canKillWhichCharacters(monster: Monster) {
        const damage = this.calculateDamage(monster);
        const deathList = this.characters.filter(pc => pc.hp <= damage);
        return deathList;
    }

    // Enemy AI for choosing a target
    private chooseTarget(monster: Monster) {
        const chars = this.getCharacters();
        // 1. Is anyone currently attacking it?
        const targetedTurn = this.combatLog.getLastTurnCreatureTargeted(monster);
        if (targetedTurn) {
            const lastAttacker = this.turnOrder[targetedTurn[ATTACKER_IDX]];
            return lastAttacker;
        }
        // 2. Is anyone at very low health?
        const deathList = this.canKillWhichCharacters(monster);
        if (deathList.length) {
            return deathList[rand(deathList.length)];
        }
        // 3. TODO: Is anyone casting spells?
        // 4. Pick someone random.
        const target = chars[rand(chars.length)];
        return target;
    }

    calculateDamage(attacker: Creature): number {
        const baseDamage = attacker.damage;
        const weapon = attacker.getWeapon();
        const weaponDamage = weapon ? weapon.damage : 0;
        return baseDamage + weaponDamage;
    }
}
