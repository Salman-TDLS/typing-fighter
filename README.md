# Typing Fighter

A turn-based magic dueling game where players cast spells by typing their names.

**Current status:** Type `start` and press Enter to open the solo arena. Both sides start at 5 HP.
`fire` deals 1 damage on impact and adds 1 burn damage in the following round only. `air` deals 1 damage, for 2 total if the target takes burn damage that round.
`water` normally deals 1 damage. It leaves an unshielded target wet for the next round, or breaks a `rock` shield and leaves the target dry.
If `water` hits a target with a pending burn, it puts out the fire. Neither `water` nor the burn deals damage that round.
An unshielded target still becomes wet when `water` puts out a burn. Wet wears off at the end of the following round.
While wet, a target takes no damage or burn from `fire` and takes 2 damage from `electric` instead of 1.
`rock` deals no damage and shields its caster for the rest of the current round and the next. `cure` gives its caster 1 HP and deals no damage.
Each side can use each spell once per duel.
The indicators under each side's HP are lit for ready spells. After a spell is cast, its indicator dims and is crossed out.
Burn, Wet, and Shield badges stay visible beside both HP counters and light up while active.
A line below each HP counter explains the last round's damage, healing, blocked hits, and combos.
The arena shows the result when the duel ends. Click **Restart** to begin a new duel.

## Planned Gameplay

Players face off in magical duels, using speed, elemental effects, and strategy to defeat their opponents.

1. **Choose a spell** – Pick one you haven't used in this duel.
2. **Cast your spell** – Type its name and press Enter to use it immediately.
3. **Computer responds** – If it still has HP, it casts its next unused spell.
4. **Start the next round** – Your turn and the computer's turn count as one round for spell effects. You can then cast another unused spell while both sides have HP.

## Win and Lose Conditions

- **Win** – Reduce your opponent's health to zero.
- **Lose** – Your health reaches zero.
- **Both sides out of spells** – Higher remaining HP wins. Equal HP is a draw.

## Features

- Turn-based spellcasting through typing
- Multiple spells with unique elemental effects

## Project Planning

[Project board](https://github.com/users/Salman-TDLS/projects/3) \
Wireframe
<img width="2013" height="1660" alt="Untitled-2026-11-16-1813" src="https://github.com/user-attachments/assets/fb504541-29f6-4312-b522-3efca2112f6a" />

### Game Description

A type the skill to make it work and attack type of game, magic fantasy theme.

### Sprint 1

Goal: The player should be able to use all the skills to deal damage, see their cooldowns, and win or lose.

Start: 16 Nov
End: 24 Nov
