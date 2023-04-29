import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import SmartCombatLog, {
    ActionRole,
    LogEntryAction
} from "./SmartCombatLog";
import TurnBasedEncounter from "../TurnBasedEncounter";
import Character from "../../creatures/Character";
import Monster from "../../creatures/Monster";
import { rand } from "../../../util";
import Creature from "../../creatures/Creature";
import Narrator from "../../Narrator";
import {
    SpellCommand,
    AttackCommand,
    UseCommand,
    MoveCommand,
    AttackSelection,
    SpellCastSelection,
    SpellTargetSelection,
    UseSelection,
} from "../../actions";
import { CommandInteraction, SelectMenuInteraction } from "../../../types";
import Action from "../../actions/Action";
import CombatPositionCache, { CombatPosition } from "./CombatPositionCache";
import TurnOrder from "../TurnOrder";

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

    /**
     * The heldMovement property is just a flag that marks whether or
     * not the player has chosen to move on their turn. Once a turn-consuming
     * action is completed, the heldMovement flag is checked and the
     * player is moved in or out of melee range.
     */
    heldMovement?: boolean;

    positions: CombatPositionCache;

    commands = {
        move: new MoveCommand(async (interaction: CommandInteraction) => {
            this.toggleMovement();

            let movementText;
            if (this.heldMovement) {
                movementText = "You will move once you submit your action.";
            } else {
                movementText = "You will no longer move before your action.";
            }

            await this.narrator.reply(interaction, {
                ephemeral: true,
                content: movementText
            });
        }),
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
        this.turnOrder = new TurnOrder(this.characters, this.monsters);
        this.positions = new CombatPositionCache(this.characters, this.monsters);
        this.combatLog = new SmartCombatLog(this.turnOrder.getTurns());
        console.info(
            "Combat encounter started...",
            this.getCharacterNames(), "vs", this.getMonsterNames()
        );
    }

    getMonsterByIndex = (index: number) => this.monsters[index];

    getMonsterNames = () => this.monsters.map(m => m.getName());

    getTotalCharacterHp = () => this.characters.reduce((acc, curr) => acc + curr.hp, 0);

    getTotalMonsterHp = () => this.monsters.reduce((acc, curr) => acc + curr.hp, 0);

    // We make an assertion here because the ID *should* always be valid
    getCreatureById(creatureId: string) {
        const creature = this.characters.find(c => c.id === creatureId)
            || this.monsters.find(m => m.id === creatureId);
        if (!creature) {
            throw new Error(`No creature exists with ID '${creatureId}'`);
        }
        return creature;
    }

    getTurnOrderNames = () => this.turnOrder.getTurns().map((creatureId) => {
        const creature = this.getCreatureById(creatureId);
        return creature.getName();
    });

    getCurrentTurnCreature = () => this.getCreatureById(this.turnOrder.getCurrentTurn());

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
        this.completeMovement();
    }

    /**
     * @override
     */
    async handleTurn() {
        const currentTurn = this.getCurrentTurnCreature();
        if (!currentTurn) {
            throw new Error("Invalid ID at current turn index, aborting");
        }
        await this.narrator.ponderAndDescribe(`It is ${currentTurn.getName()}'s turn.`);
        // If its a monster's turn, invoke its handler
        if (currentTurn instanceof Monster) {
            await this.handleMonsterTurn();
        }
    }

    /* COMBAT METHODS */

    private toggleMovement() {
        this.heldMovement = !this.heldMovement;
    }

    private completeMovement() {
        this.heldMovement = false;
    }

    /**
     * Movement is handled once a turn-consuming action is received and being
     * processed. Movement is processed before or after the action is, depending
     * on the action.
     */
    private async handleMove(creature: Creature) {
        this.positions.moveCreature(creature.id);
        this.completeMovement();

        const newPosition = this.positions.getCreaturePosition(creature.id);
        await this.narrator.describeMovement(creature, newPosition);
    }

    private mustMoveBeforeAttack(attacker: Creature, target: Creature, hasRanged = false) {
        const withinMeleeRange = this.positions.compareEnemyPositions(attacker.id, target.id);
        // AKA, must run to the proper range to use weapon on the enemy
        return hasRanged === withinMeleeRange;
    }

    private validateAttackRange(attacker: Creature, target: Creature, hasRanged = false) {
        // TEMP: Monsters cannot move at the moment
        if (attacker instanceof Monster) {
            return;
        }
        const targetPosition = this.positions.getCreaturePosition(target.id);
        if (targetPosition === CombatPosition.Range && !hasRanged) {
            throw new Error("This enemy is at range, you must use a ranged attack.");
        }
        const mustMove = this.mustMoveBeforeAttack(attacker, target);
        if (mustMove && !this.heldMovement) {
            throw new Error("You must **/move** to attack with this option!");
        }
    }

    private async handleAttack(attacker: Creature, target: Creature) {
        const hasRangedWeapon = attacker.hasRangedWeapon();
        this.validateAttackRange(attacker, target, hasRangedWeapon);

        if (this.mustMoveBeforeAttack(attacker, target, hasRangedWeapon)) {
            await this.handleMove(attacker);
        }

        const damage = attacker.getDamage();
        target.setHp(target.hp - damage);

        const weaponId = attacker.getWeaponId();
        this.combatLog.append(
            LogEntryAction.Attack,
            weaponId,
            damage,
            [this.turnOrder.getIdx(attacker.id), this.turnOrder.getIdx(target.id)]
        );

        await this.narrator.describeAttack(attacker, target, damage);

        if (this.heldMovement) {
            await this.handleMove(attacker);
        }
    }

    private holdSpell(spellId: string) {
        this.heldSpell = spellId;
    }

    private releaseSpell() {
        this.heldSpell = undefined;
    }

    private async handleSpell(caster: Creature, target: Creature, spellId: string) {
        const heldSpell = caster.getSpell(spellId);
        if (!heldSpell) {
            throw new Error("You are not holding this spell...");
        }

        const isRangedSpell = heldSpell.isRanged();
        this.validateAttackRange(caster, target, isRangedSpell);

        if (this.mustMoveBeforeAttack(caster, target, isRangedSpell)) {
            await this.handleMove(caster);
        }

        const damage = heldSpell.damage || 0;
        target.setHp(target.hp - damage);

        this.combatLog.append(
            LogEntryAction.Spell,
            spellId,
            damage,
            [this.turnOrder.getIdx(caster.id), this.turnOrder.getIdx(target.id)]
        );

        await this.narrator.describeCastSpell(caster, heldSpell, damage);

        if (this.heldMovement) {
            await this.handleMove(caster);
        }

        this.releaseSpell();
    }

    private async handleUseItem(character: Character, itemId: string) {
        character.useItem(itemId);

        if (this.heldMovement) {
            await this.handleMove(character);
        }

        const itemValue = 0;
        this.combatLog.append(
            LogEntryAction.Use,
            itemId,
            itemValue,
            [this.turnOrder.getIdx(character.id)]
        );
    }

    /* ENEMY AI METHODS */

    private async handleMonsterTurn() {
        let monster;
        try {
            monster = this.getCurrentTurnCreature();
            if (!(monster instanceof Monster)) {
                throw new Error("Invalid creature for monster turn, aborting");
            }
            // TODO: Enemies should also be able to choose their action, e.g. attack,
            // spell, item, etc., and this would inform their target (or lack thereof).
            const target = this.chooseTarget(monster);
            await this.handleAttack(monster, target);
        } catch (err) {
            const monsterName = monster?.getName() || "Nameless";
            await this.narrator.ponderAndDescribe(`The ${monsterName} becomes confused...`);
            console.error("Unexpected failure on monster turn:", err);
        } finally {
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
        const charIds = chars.map(c => c.id);
        // 1. Is anyone currently attacking it?
        const targetedTurn = this.combatLog.getLastTurnCreatureTargeted(monster.id);
        if (targetedTurn) {
            const attackerIdx = targetedTurn.creatures[ActionRole.Actor];
            return this.getCreatureById(this.turnOrder.getTurn(attackerIdx));
        }
        // 2. Is anyone at very low health?
        const deathList = this.canKillWhichCharacters(monster);
        if (deathList.length) {
            return deathList[rand(deathList.length)];
        }
        // 3. Is anyone casting spells?
        const casterIds = this.combatLog.getCreaturesCastingSpells(charIds);
        if (casterIds.length) {
            return this.getCreatureById(casterIds[rand(casterIds.length)]);
        }
        // 4. Just pick somebody random!
        const target = chars[rand(chars.length)];
        return target;
    }
}
