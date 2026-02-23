import {
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import SmartCombatLog from "./SmartCombatLog";
import TurnBasedEncounter from "../TurnBasedEncounter";
import Character from "../../creatures/Character";
import Monster from "../../creatures/Monster";
import { rand, randInList } from "../../../util";
import { EncounterType } from "../../../constants";
import Creature from "../../creatures/Creature";
import Narrator from "../../Narrator";
import {
    Action,
    SpellCommand,
    AttackCommand,
    UseCommand,
    MoveCommand,
    SkipCommand,
    AttackSelection,
    SpellCastSelection,
    SpellTargetSelection,
    UseSelection,
    MoveButton,
    AttackButton,
    SpellButton,
    UseButton,
    SkipButton
} from "../../actions";
import Spell, { AttackSpell } from "../../things/Spell";
import Weapon from "../../things/Weapon";
import Item from "../../things/Item";
import { ButtonPressInteraction, CommandInteraction, SelectMenuInteraction } from "../../../types";
import CombatPositionCache from "./CombatPositionCache";
import TurnOrder from "../TurnOrder";
import { StringSelectMenuOptionBuilder } from "@discordjs/builders";

interface AttackOption {
    target: Creature;
    attack: AttackSpell<Spell> | Weapon;
    reason?: string;
}

export default class CombatEncounter extends TurnBasedEncounter {
    type = EncounterType.Combat;
    description = "In a fight! :crossed_swords:";

    monsters: Monster[] = [];

    combatLog: SmartCombatLog;

    /**
     * The heldSpell property is the ID of the spell selected in the
     * 'spell:cast' command, temporarily cached until the user chooses
     * a target. There can only ever be one, since a single user can
     * only hold one spell, and combat encounters are turn-based.
     * TODO: This would change if we ever support preselecting actions for
     * future turns OR if ever have spells that are held for multiple turns.
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

    lootCache: Record<string, Item[]> = {};

    handlePlayerMove = async (interaction: CommandInteraction | ButtonPressInteraction) => {
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
    };

    handlePlayerAttack = async (
        interaction: CommandInteraction | ButtonPressInteraction,
        character: Character
    ) => {
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
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("attack")
                        .setPlaceholder("Nothing selected")
                        .addOptions(this.getTargetOptions())
                );
            await this.narrator.reply(interaction, {
                ephemeral: true,
                embeds: [embed],
                components: [row]
            });
        }
    };

    handlePlayerSpell = async (
        interaction: CommandInteraction | ButtonPressInteraction,
        character: Character
    ) => {
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
    };

    handlePlayerUse = async (
        interaction: CommandInteraction | ButtonPressInteraction,
        character: Character
    ) => {
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
    };

    handlePlayerSkip = async (
        interaction: CommandInteraction | ButtonPressInteraction,
        character: Character
    ) => {
        if (this.heldMovement) {
            await this.handleMove(character);
        }

        await this.narrator.ponderAndReply(interaction, {
            content: `${character.getName()} skips their turn.`,
            components: [],
            embeds: []
        });
    };

    handlePlayerAttackSelection = async (
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
    };

    handlePlayerSpellSelection = async (
        interaction: SelectMenuInteraction,
        character: Character
    ) => {
        const spellId = interaction.values[0];
        const spell = character.getSpell(spellId);
        if (!spell) {
            throw new Error("You do not have this spell, aborting");
        }
        this.holdSpell(spellId);

        if (this.getAliveMonsters().length === 1) {
            await this.narrator.ponderAndUpdate(interaction, {
                content: "You prepare to cast the spell...",
                embeds: [],
                components: []
            });

            await this.handleSpell(character, this.getAliveMonsters()[0], spellId);
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setDescription(`You choose to cast **${spell.name}**. `
                    + "Who do you want to target?");
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("spell:target")
                        .setPlaceholder("Nothing selected")
                        .addOptions(this.getTargetOptions())
                );
            await this.narrator.ponderAndUpdate(interaction, {
                components: [row],
                embeds: [embed]
            });
        }
    };

    handlePlayerSpellTarget = async (
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
    };

    handlePlayerUseSelection = async (interaction: SelectMenuInteraction, character: Character) => {
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
    };

    buttons = {
        move: new MoveButton(this.handlePlayerMove),
        attack: new AttackButton(this.handlePlayerAttack),
        spell: new SpellButton(this.handlePlayerSpell),
        use: new UseButton(this.handlePlayerUse),
        skip: new SkipButton(this.handlePlayerSkip)
    };

    commands = {
        move: new MoveCommand(this.handlePlayerMove),
        attack: new AttackCommand(this.handlePlayerAttack),
        spell: new SpellCommand(this.handlePlayerSpell),
        use: new UseCommand(this.handlePlayerUse),
        skip: new SkipCommand(this.handlePlayerSkip)
    };

    menus = {
        attack: new AttackSelection(this.handlePlayerAttackSelection),
        "spell:cast": new SpellCastSelection(this.handlePlayerSpellSelection),
        "spell:target": new SpellTargetSelection(this.handlePlayerSpellTarget),
        use: new UseSelection(this.handlePlayerUseSelection)
    };

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

    getResults = () => ({
        success: this.isSuccess(),
        xp: this.getXpReward(),
        loot: this.monsters.reduce((acc: Item[], monster) => [...acc, ...monster.getLoot()], [])
    });

    getMonsterByIndex = (index: number) => this.monsters[index];

    getMonsterNames = () => this.monsters.map(m => m.getName());

    getAliveMonsters = () => this.monsters.filter(m => !m.isDead());

    getAliveMonsterNames = () => this.getAliveMonsters().map(m => m.getName());

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

    getTargetOptions = () => {
        const options: StringSelectMenuOptionBuilder[] = [];
        this.monsters.forEach((m, idx) => {
            if (!m.isDead()) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(m.getName())
                    .setValue(idx.toString()));
            }
        });
        return options;
    };

    /**
     * The base value for combat encounters is double that of a normal encounter, since
     * combat is the most resource-intensive, time-consuming, and risky. The base value is
     * set so that a single combat encounter at level 1 grants enough XP for level 2.
     * @override
     */
    getXpReward = () => 3;

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
        if (currentTurn.isDead()) {
            await this.handleNextTurn();
        } else {
            await this.narrator.ponderAndDescribe(`It is ${currentTurn.getName()}'s turn.`);
            // If its a monster's turn, invoke its handler
            if (currentTurn instanceof Monster) {
                await this.handleMonsterTurn();
            }
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

    private mustMoveBeforeAttack(attacker: Creature, target: Creature, isRangedAttack: boolean) {
        const withinMeleeRange = this.positions.compareEnemyPositions(attacker.id, target.id);
        // If enemy is at range, assume attacker has ranged weapon and move into melee range;
        // enemies at range can only be attacked by ranged weapons from melee range.
        if (this.positions.isInRangePosition(target.id)) {
            return !withinMeleeRange;
        }
        // AKA, must run to the proper range to use weapon on the enemy
        return isRangedAttack === withinMeleeRange;
    }

    private validateAttackRange(attacker: Creature, target: Creature, isRangedAttack: boolean) {
        if (this.positions.isInRangePosition(target.id) && !isRangedAttack) {
            throw new Error("This enemy is at range, you must use a ranged attack.");
        }
        const mustMove = this.mustMoveBeforeAttack(attacker, target, isRangedAttack);
        // Monsters are always willing to move if it means attacking their target
        const willMove = attacker instanceof Monster ? true : this.heldMovement;
        if (mustMove && !willMove) {
            throw new Error("You must **Move** to attack with this option!");
        }
    }

    private calculateDamage(target: Creature, damage: number) {
        const ac = target.getArmorClass();
        const acDamageDiff = ac - damage;
        // If AC is not at least the damage value, the attack does full damage.
        if (acDamageDiff <= 0) {
            return damage;
        }
        // To get the true damage, we multiple the damage value by the proportion of
        // the damage value to the difference between the AC and the damage.
        const trueDamage = (damage / acDamageDiff) * damage;
        // If true damage isn't at least 1, the attack does no damage and is "blocked".
        if (trueDamage < 1) {
            return 0;
        }
        // If the attack does damage but is reduced by AC, it is considered "glancing".
        return Math.round(trueDamage);
    }

    private async handleAttack(attacker: Creature, target: Creature) {
        const hasRangedWeapon = attacker.hasRangedWeapon();
        this.validateAttackRange(attacker, target, hasRangedWeapon);

        if (this.mustMoveBeforeAttack(attacker, target, hasRangedWeapon)) {
            await this.handleMove(attacker);
        }

        const damage = this.calculateDamage(target, attacker.getDamage());
        target.setHp(target.hp - damage);

        const weaponId = attacker.getWeaponId();
        this.combatLog.appendAttack(
            weaponId,
            damage,
            [this.turnOrder.getIdx(attacker.id), this.turnOrder.getIdx(target.id)]
        );

        await this.narrator.describeAttack(attacker, target, damage);

        if (this.heldMovement) {
            await this.handleMove(attacker);
        }

        if (target.isDead()) {
            await this.narrator.describeDeath(target);
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

        const spellDamage = heldSpell.damage || 0;
        const damage = this.calculateDamage(target, spellDamage);
        target.setHp(target.hp - damage);

        this.combatLog.appendSpell(
            spellId,
            damage,
            [this.turnOrder.getIdx(caster.id), this.turnOrder.getIdx(target.id)]
        );

        await this.narrator.describeCastSpell(caster, heldSpell, damage);

        if (this.heldMovement) {
            await this.handleMove(caster);
        }

        this.releaseSpell();

        if (target.isDead()) {
            await this.narrator.describeDeath(target);
        }
    }

    public async handleUseItem(character: Character, itemId: string) {
        character.useItem(itemId);

        if (this.heldMovement) {
            await this.handleMove(character);
        }

        const itemValue = 0;
        this.combatLog.appendUse(
            itemId,
            itemValue,
            [this.turnOrder.getIdx(character.id)]
        );
    }

    public handlePlayerLoot(character: Character) {
        if (this.lootCache[character.id]) {
            throw new Error("You have already looted!");
        }
        const loot = this.getResults().loot;
        const lootRoll = randInList(loot);
        character.addToInventory([lootRoll]);
        this.lootCache[character.id] = [lootRoll];
        return lootRoll;
    }

    /* ENEMY AI METHODS */

    private async handleMonsterTurn() {
        let monster;
        try {
            monster = this.getCurrentTurnCreature();
            if (!(monster instanceof Monster)) {
                throw new Error("Invalid creature for monster turn, aborting");
            }

            const attacks = this.listMonsterAttacks(monster);
            if (attacks.length == 0) {
                throw new Error("Monster has no attacks available, aborting");
            }

            // Ordered by target priority
            const attackOptions = this.getValidSortedAttackOptions(monster, attacks);
            if (attackOptions.length === 0) {
                throw new Error("Monster has no valid attack options!");
            }

            // Extremely simple AI: choose highest priority target, and then find highest damage
            // attack option against that target
            // TODO: Prefer staying at range over going into melee
            // TODO: Can very easily improve AI by re-sorting options based on score that
            // weighs priority, damage, status effects, resistances, etc
            const chosenTarget = attackOptions[0].target;
            const chosenAttackOption = attackOptions
                .filter((ao) => ao.target === chosenTarget)
                .sort((a, b) => b.attack.damage - a.attack.damage)[0];

            console.info(attackOptions.length, "attack options for", monster.getName(), ", chose", {
                target: chosenTarget.getName(),
                attack: chosenAttackOption.attack.name,
                reason: chosenAttackOption.reason
            });
            await this.handleMonsterAttack(monster, chosenAttackOption);
        } catch (err) {
            const monsterName = monster?.getName() || "Nameless";
            await this.narrator.ponderAndDescribe(`The ${monsterName} becomes confused...`);
            console.error("Unexpected failure on monster turn:", err);
        } finally {
            await this.handleNextTurn();
        }
    }

    private async handleMonsterAttack(monster: Monster, attackOption: AttackOption) {
        const { target, attack } = attackOption;
        if (attack instanceof Spell) {
            await this.handleSpell(monster, target, attack.id);
        } else {
            await this.handleAttack(monster, target);
        }
    }

    private listMonsterAttacks(monster: Monster) {
        const weapon = monster.getWeapon();
        const attacks = [...monster.getMeleeAttackSpells(), ...monster.getRangedAttackSpells()];
        if (weapon) {
            attacks.push(weapon);
        }
        return attacks;
    }

    /**
     * Takes a target and a list of attacks, and returns a list of attack
     * option objects that are valid against the target at their respective
     * ranges. Other conditions can be added later as needed.
     */
    private getValidAttackOptionsForTarget(
        attacks: (AttackSpell<Spell> | Weapon)[],
        target: Creature,
        reason?: string
    ): AttackOption[] {
        const inRangePosition = this.positions.isInRangePosition(target.id);
        return attacks
            .filter(a => inRangePosition ? a.isRanged() : true)
            .map(attack => ({ target, attack, reason }));
    }

    /**
     * Compiles a sorted list of attack options ordered by target priority, and only
     * listing attacks that are valid against each target. This method treats attack
     * options with the same attack and target as distinct if they have different reasons.
     */
    private getValidSortedAttackOptions(
        monster: Monster,
        attacks: (AttackSpell<Spell> | Weapon)[]
    ) {
        const attackOptions: AttackOption[] = [];
        // 1. Is anyone currently attacking it?
        const targetedTurn = this.combatLog.getLastTurnCreatureTargeted(monster.id);
        if (targetedTurn) {
            const attackerIdx = SmartCombatLog.getEntryActor(targetedTurn);
            const lastAttacker = this.getCreatureById(this.turnOrder.getTurn(attackerIdx));
            attackOptions.push(
                ...this.getValidAttackOptionsForTarget(attacks, lastAttacker, "revenge"));
        }
        const chars = this.getCharacters();
        // 2. Is anyone at very low health?
        chars.forEach((pc) => {
            const koAttacks = this.getValidAttackOptionsForTarget(attacks, pc, "execute")
                .filter((attackOption) => {
                    const attack = attackOption.attack;
                    return pc.hp <= attack.damage;
                });
            attackOptions.push(...koAttacks);
        });
        // 3. Is anyone casting spells?
        const charIds = chars.map(c => c.id);
        const casterIds = this.combatLog.getCreaturesCastingSpells(charIds);
        casterIds.forEach((casterId) => {
            const caster = this.getCreatureById(casterId);
            attackOptions.push(...this.getValidAttackOptionsForTarget(attacks, caster, "caster"));
        });
        // 4. Just pick somebody random!
        const randomTarget = chars[rand(chars.length)];
        attackOptions.push(...this.getValidAttackOptionsForTarget(attacks, randomTarget, "random"));
        return attackOptions;
    }
}
