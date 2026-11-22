//_Constants______________________________________
const command = document.querySelector('#command')
const message = document.querySelector('#message')
const startWord = document.querySelector('#start-word')
const menu = document.querySelector('#menu')
const arena = document.querySelector('#arena')
const spell = document.querySelector('#spell')
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
let playerHp = 10
let enemyHp = 10
const playerEffects = { shieldRounds: 0, wet: false, burnDamage: 0 }
const enemyEffects = { shieldRounds: 0, wet: false, burnDamage: 0 }
// slice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
const playerSpells = spells.slice()
const enemySpells = spells.slice()

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
  // A computer at zero HP cannot cast back
  if (enemyHp > 0) {
    const computerSpell = enemySpells[0]
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

  playerHpDisplay.textContent = playerHp
  enemyHpDisplay.textContent = enemyHp

  // Light up the effects that are active for the next round
  const duelEnded = playerHp === 0 || enemyHp === 0
  spell.disabled = duelEnded
  playerBurnBadge.classList.toggle('active', !duelEnded && playerEffects.burnDamage > 0)
  playerWetBadge.classList.toggle('active', !duelEnded && playerEffects.wet)
  playerShieldBadge.classList.toggle('active', !duelEnded && playerEffects.shieldRounds > 0)
  enemyBurnBadge.classList.toggle('active', !duelEnded && enemyEffects.burnDamage > 0)
  enemyWetBadge.classList.toggle('active', !duelEnded && enemyEffects.wet)
  enemyShieldBadge.classList.toggle('active', !duelEnded && enemyEffects.shieldRounds > 0)
  showRoundResult(playerRoundResult, playerHit, playerSpell.healing)
  showRoundResult(enemyRoundResult, enemyHit, enemyHealing)
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
  playerHpDisplay.textContent = playerHp
  enemyHpDisplay.textContent = enemyHp
  menu.hidden = true
  arena.hidden = false
  spell.focus()
})

document.querySelector('#spell-form').addEventListener('submit', (event) => {
  event.preventDefault()

  if (spell.disabled) {
    return
  }

  const spellName = spell.value.trim().toLowerCase()
  for (let index = 0; index < playerSpells.length; index = index + 1) {
    if (playerSpells[index].name === spellName) {
      playRound(index)
      spell.value = ''
      return
    }
  }
})
