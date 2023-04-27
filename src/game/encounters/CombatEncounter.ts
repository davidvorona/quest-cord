import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import SmartCombatLog, {
    ActionRole,
    LogEntryAction
} from "../../services/SmartCombatLog";
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
            if (this.monsters.length === 1) {
                const target = this.monsters[0];

                await this.narrator.reply(interaction, {
                    ephemeral: true,
                    content: "You prepare to attack the creature...",
                    components: [],
                    embeds: []
                });

                await this.handleAttack(character, target);
            } else {
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
            const spells = character.getSpells();
            if (spells.length) {
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setDescription("What spell do you want to cast?");
                const options = spells.map(s => ({
                    label: s.name,
                    value: s.id
                }));
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

            if (this.monsters.length === 1) {
                await this.narrator.ponderAndUpdate(interaction, {
                    content: "You prepare to cast the spell...",
                    embeds: [],
                    components: []
                });

                await this.handleSpell(character, this.monsters[0], spellId);
            } else {
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

            const targetIdx = Number(interaction.values[0]);
            const target = this.getMonsterByIndex(targetIdx);

            await this.handleSpell(character, target, this.heldSpell);
        }),
        new UseSelection(async (interaction: SelectMenuInteraction, character: Character) => {
            try {
                const itemId = interaction.values[0];
                this.handleUseItem(character, itemId);
                await this.narrator.ponderAndUpdate(interaction, {
                    content: `You use the ${itemId}.`,
                    components: [],
                    embeds: []
                });
            } catch (err) {
                await this.narrator.reply(interaction, {
                    content: "You do not have this item!",
                    ephemeral: true
                });
            }
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

    getMonsterByIndex = (index: number) => this.monsters[index];

    getMonsterNames = () => this.monsters.map(m => m.getName());

    getTotalCharacterHp = () => this.characters.reduce((acc, curr) => acc + curr.hp, 0);

    getTotalMonsterHp = () => this.monsters.reduce((acc, curr) => acc + curr.hp, 0);

    /**
     * @override
     */
    getXpReward = () => Math.max(this.monsters.length * 5, 10);

    /**
     * @override
     */
    isOver = () => !this.getTotalCharacterHp() || !this.getTotalMonsterHp();

    /**
     * @override
     */
    isSuccess = () => !this.getTotalMonsterHp();

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

    /* COMBAT METHODS */

    private holdSpell(spellId: string) {
        this.heldSpell = spellId;
    }

    private releaseSpell() {
        this.heldSpell = undefined;
    }

    private async handleAttack(attacker: Creature, target: Creature) {
        const damage = attacker.getDamage();
        target.setHp(target.hp - damage);

        const weaponId = attacker.getWeaponId();
        this.combatLog.append(
            LogEntryAction.Attack,
            weaponId,
            damage,
            [this.getTurnOrderIdx(attacker), this.getTurnOrderIdx(target)]
        );

        await this.narrator.describeAttack(attacker, target, damage);
    }

    private async handleSpell(caster: Creature, target: Creature, spellId: string) {
        const heldSpell = caster.getSpell(spellId);
        if (!heldSpell) {
            throw new Error("You are not holding this spell...");
        }

        const damage = heldSpell.damage || 0;
        target.setHp(target.hp - damage);

        this.combatLog.append(
            LogEntryAction.Spell,
            spellId,
            damage,
            [this.getTurnOrderIdx(caster), this.getTurnOrderIdx(target)]
        );

        await this.narrator.describeCastSpell(caster, heldSpell, damage);

        this.releaseSpell();
    }

    private handleUseItem(character: Character, itemId: string) {
        character.useItem(itemId);

        const itemValue = 0;
        this.combatLog.append(
            LogEntryAction.Use,
            itemId,
            itemValue,
            [this.getTurnOrderIdx(character)]
        );
    }

    /* ENEMY AI METHODS */

    private async handleMonsterTurn() {
        const currentTurn = this.getCurrentTurn();
        if (currentTurn instanceof Monster) {
            // TODO: Enemies should also be able to choose their action, e.g. attack,
            // spell, item, etc., and this would inform their target (or lack thereof).
            const target = this.chooseTarget(currentTurn);
            await this.handleAttack(currentTurn, target);

            await this.handleNextTurn();
        }
    }

    private canKillWhichCharacters(monster: Monster) {
        const damage = monster.getDamage();
        const deathList = this.characters.filter(pc => pc.hp <= damage);
        return deathList;
    }

    // Enemy AI for choosing a target
    private chooseTarget(monster: Monster) {
        const chars = this.getCharacters();
        // 1. Is anyone currently attacking it?
        const targetedTurn = this.combatLog.getLastTurnCreatureTargeted(monster);
        if (targetedTurn) {
            const lastAttacker = this.turnOrder[targetedTurn.creatures[ActionRole.Actor]];
            return lastAttacker;
        }
        // 2. Is anyone at very low health?
        const deathList = this.canKillWhichCharacters(monster);
        if (deathList.length) {
            return deathList[rand(deathList.length)];
        }
        // 3. Is anyone casting spells?
        const casters = this.combatLog.getCreaturesCastingSpells(chars);
        if (casters.length) {
            return casters[rand(casters.length)];
        }
        // 4. Just pick somebody random!
        const target = chars[rand(chars.length)];
        return target;
    }
}
