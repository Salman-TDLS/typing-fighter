//_Constants______________________________________
const command = document.querySelector('#command')
const message = document.querySelector('#message')
const startWord = document.querySelector('#start-word')
const menu = document.querySelector('#menu')
const arena = document.querySelector('#arena')
const arenaTitle = document.querySelector('#arena-title')
const playerFighter = document.querySelector('#player-fighter')
const enemyFighter = document.querySelector('#enemy-fighter')
const spell = document.querySelector('#spell')
const spellMessage = document.querySelector('#spell-message')
const restartButton = document.querySelector('#restart-button')
const playerHpDisplay = document.querySelector('#player-hp')
const enemyHpDisplay = document.querySelector('#enemy-hp')
const playerBurnBadge = document.querySelector('#player-burn')
const playerWetBadge = document.querySelector('#player-wet')
const playerShieldBadge = document.querySelector('#player-shield')
const enemyBurnBadge = document.querySelector('#enemy-burn')
const enemyWetBadge = document.querySelector('#enemy-wet')
const enemyShieldBadge = document.querySelector('#enemy-shield')
const playerRoundResult = document.querySelector('#player-round-result')
const enemyRoundResult = document.querySelector('#enemy-round-result')
const startingHp = 5

// Both sides start with the spells in this list
// Damage lowers the opponent's HP. Healing raises the caster's HP
const spells = [
  { name: 'fire', damage: 1, healing: 0, burnDamage: 1 },
  { name: 'air', damage: 1, healing: 0 },
  { name: 'electric', damage: 1, healing: 0, wetBonusDamage: 1 },
  { name: 'water', damage: 1, healing: 0, breaksShield: true },
  { name: 'rock', damage: 0, healing: 0, shieldRounds: 2 },
  { name: 'cure', damage: 0, healing: 1 }
]

//_Variables______________________________________
let playerHp
let enemyHp
let playerEffects
let enemyEffects
let playerSpells
let enemySpells

//_Functions______________________________________
function isStartCommand() {
  return command.value.trim().toLowerCase() === 'start'
}

// Work out one side's incoming damage and its effects for the next round
function resolveDamage(effects, incomingSpell) {
  // Wet and burn from the previous round expire after this round
  const wasWet = effects.wet
  const burnDamage = effects.burnDamage
  let reason = ''
  effects.wet = false
  effects.burnDamage = 0

  // Water breaks a shield or makes an unshielded target wet next round
  if (incomingSpell && incomingSpell.breaksShield) {
    if (effects.shieldRounds > 0) {
      effects.shieldRounds = 0
      reason = 'Water broke the shield'
    } else {
      effects.wet = true
    }
    // If water puts out a burn, neither water nor the burn deals damage
    if (burnDamage > 0) {
      return { damage: 0, reason: 'Water put out the burn' }
    }
  }

  // An active shield blocks damage
  if (effects.shieldRounds > 0) {
    if (burnDamage > 0 || (incomingSpell && incomingSpell.damage > 0)) {
      reason = 'Rock blocked damage'
    }
    return { damage: 0, reason: reason }
  }

  if (!incomingSpell) {
    if (burnDamage > 0) {
      reason = 'Burn'
    }
    return { damage: burnDamage, reason: reason }
  }

  // Wet stops fire before it deals damage or starts a burn
  if (wasWet && incomingSpell.name === 'fire') {
    return { damage: burnDamage, reason: 'Wet stopped fire' }
  }

  let damage = burnDamage + incomingSpell.damage
  if (incomingSpell.damage > 0 && reason === '') {
    reason = incomingSpell.name
  }
  if (incomingSpell.burnDamage) {
    effects.burnDamage = incomingSpell.burnDamage
  }
  if (wasWet && incomingSpell.wetBonusDamage) {
    damage = damage + incomingSpell.wetBonusDamage
    reason = 'Electric + Wet'
  }
  if (burnDamage > 0) {
    if (reason === '') {
      reason = 'Burn'
    } else {
      reason = reason + ' + Burn'
    }
  }
  return { damage: damage, reason: reason }
} 

// Show what changed HP in the round that just ended
function showRoundResult(display, hit, healing) {
  let text = hit.reason
  if (hit.damage > 0) {
    text = '-' + hit.damage + ' HP · ' + text
  } else if (text !== '') {
    text = '0 damage · ' + text
  }

  if (healing > 0) {
    if (text !== '') {
      text = text + ' · '
    }
    text = text + '+' + healing + ' HP · Cure'
  }

  display.textContent = text
  display.classList.toggle('damage', hit.damage > 0)
  display.classList.toggle('healing', hit.damage === 0 && healing > 0)
} 

// The side with more HP wins. Equal HP is a draw
function showDuelResult() {
  if (playerHp > enemyHp) {
    arenaTitle.textContent = 'You win'
  } else if (playerHp < enemyHp) {
    arenaTitle.textContent = 'You lose'
  } else {
    arenaTitle.textContent = 'Draw'
  }
}

// Update HP, effects, and which control the player can use
function updateDuelDisplay(duelEnded) {
  playerHpDisplay.textContent = playerHp
  enemyHpDisplay.textContent = enemyHp
  spell.disabled = duelEnded
  restartButton.hidden = !duelEnded

  playerBurnBadge.classList.toggle('active', !duelEnded && playerEffects.burnDamage > 0)
  playerWetBadge.classList.toggle('active', !duelEnded && playerEffects.wet)
  playerShieldBadge.classList.toggle('active', !duelEnded && playerEffects.shieldRounds > 0)
  enemyBurnBadge.classList.toggle('active', !duelEnded && enemyEffects.burnDamage > 0)
  enemyWetBadge.classList.toggle('active', !duelEnded && enemyEffects.wet)
  enemyShieldBadge.classList.toggle('active', !duelEnded && enemyEffects.shieldRounds > 0)
}

// Stop any animation left over when a new round or duel starts
// getAnimations: https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations
function clearBattleAnimations() {
  for (const fighter of [playerFighter, enemyFighter]) {
    for (const animation of fighter.getAnimations()) {
      animation.cancel()
    }
  }
}

// Play the eight frames in the cast or hit row
// animate: https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
// steps: https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/steps
function animateFighter(fighter, action, delay) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  let row = '0%'
  if (action === 'hit') {
    row = '100%'
  }
  fighter.animate([
    { backgroundPosition: '0% ' + row },
    { backgroundPosition: '100% ' + row }
  ], { duration: 320, delay: delay, easing: 'steps(8, jump-none)' })
}

// Reset both sides for the first duel or a restart
function startDuel() {
  clearBattleAnimations()
  playerHp = startingHp
  enemyHp = startingHp
  playerEffects = { shieldRounds: 0, wet: false, burnDamage: 0 }
  enemyEffects = { shieldRounds: 0, wet: false, burnDamage: 0 }
  // slice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
  playerSpells = spells.slice()
  enemySpells = spells.slice()

  arenaTitle.textContent = 'Arena'
  spell.value = ''
  spellMessage.textContent = ''
  for (let index = 0; index < spells.length; index = index + 1) {
    const name = spells[index].name
    const playerIndicator = document.querySelector('#player-' + name)
    const enemyIndicator = document.querySelector('#enemy-' + name)
    playerIndicator.classList.toggle('used', false)
    enemyIndicator.classList.toggle('used', false)
  }

  const noHit = { damage: 0, reason: '' }
  showRoundResult(playerRoundResult, noHit, 0)
  showRoundResult(enemyRoundResult, noHit, 0)
  updateDuelDisplay(false)
  spell.focus()
}

// The player casts first, then the computer has a turn
function playRound(spellIndex) {
  const playerSpell = playerSpells[spellIndex]
  // splice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
  playerSpells.splice(spellIndex, 1)
  const playerIndicator = document.querySelector('#player-' + playerSpell.name)
  playerIndicator.classList.toggle('used', true)

  if (playerSpell.shieldRounds) {
    playerEffects.shieldRounds = playerSpell.shieldRounds
  }
  const enemyHit = resolveDamage(enemyEffects, playerSpell)
  enemyHp = enemyHp - enemyHit.damage
  playerHp = playerHp + playerSpell.healing

  let playerHit = { damage: 0, reason: '' }
  let enemyHealing = 0
  let computerSpell
  // A computer at zero HP cannot cast back
  if (enemyHp > 0) {
    computerSpell = enemySpells[0]
    if (computerSpell && computerSpell.shieldRounds) {
      enemyEffects.shieldRounds = computerSpell.shieldRounds
    }
    playerHit = resolveDamage(playerEffects, computerSpell)
    playerHp = playerHp - playerHit.damage
    if (computerSpell) {
      enemyHealing = computerSpell.healing
      enemyHp = enemyHp + enemyHealing
      enemySpells.splice(0, 1)
      const enemyIndicator = document.querySelector('#enemy-' + computerSpell.name)
      enemyIndicator.classList.toggle('used', true)
    }
  }

  // Age both shields once per round, after both turns
  if (playerEffects.shieldRounds > 0) {
    playerEffects.shieldRounds = playerEffects.shieldRounds - 1
  }
  if (enemyEffects.shieldRounds > 0) {
    enemyEffects.shieldRounds = enemyEffects.shieldRounds - 1
  }

  // Keep HP at zero if a hit deals more damage than the target has left
  if (playerHp < 0) {
    playerHp = 0
  }
  if (enemyHp < 0) {
    enemyHp = 0
  }

  // End the duel after a knockout or when both sides run out of spells
  const noSpellsLeft = playerSpells.length === 0 && enemySpells.length === 0
  const duelEnded = playerHp === 0 || enemyHp === 0 || noSpellsLeft
  updateDuelDisplay(duelEnded)
  if (duelEnded) {
    showDuelResult()
    restartButton.focus()
  }

  showRoundResult(playerRoundResult, playerHit, playerSpell.healing)
  showRoundResult(enemyRoundResult, enemyHit, enemyHealing)

  // Show the player's cast before the computer's reply.
  clearBattleAnimations()
  animateFighter(playerFighter, 'cast', 0)
  if (enemyHit.damage > 0) {
    animateFighter(enemyFighter, 'hit', 160)
  }
  if (computerSpell) {
    animateFighter(enemyFighter, 'cast', 480)
  }
  if (playerHit.damage > 0) {
    animateFighter(playerFighter, 'hit', 640)
  }
}

//_Event listeners________________________________
command.addEventListener('input', () => {
  startWord.classList.toggle('matched', isStartCommand())
})

document.querySelector('#start-form').addEventListener('submit', (event) => {
  event.preventDefault()

  if (!isStartCommand()) {
    message.textContent = 'Type start to begin.'
    command.focus()
    return
  }

  message.textContent = ''
  menu.hidden = true
  arena.hidden = false
  startDuel()
})

document.querySelector('#spell-form').addEventListener('submit', (event) => {
  event.preventDefault()

  if (arena.hidden || spell.disabled) {
    return
  }

  const spellName = spell.value.trim().toLowerCase()
  spellMessage.textContent = ''
  if (spellName === '') {
    return
  }

  for (let index = 0; index < playerSpells.length; index = index + 1) {
    if (playerSpells[index].name === spellName) {
      playRound(index)
      spell.value = ''
      return
    }
  }

  // A spell in the full list but missing from the player's list was already used
  for (let index = 0; index < spells.length; index = index + 1) {
    if (spells[index].name === spellName) {
      spellMessage.textContent = 'You already used ' + spellName + '.'
      return
    }
  }

  spellMessage.textContent = 'Unknown spell.'
})

restartButton.addEventListener('click', startDuel)

