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
const timer = document.querySelector('#timer')

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
let playerSpellIndex = -1 // No spell is locked in yet

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

  // A shield blocks this round's damage and uses up one of its two rounds
  if (effects.shieldRounds > 0) {
    effects.shieldRounds = effects.shieldRounds - 1
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

// Apply both spells when the countdown ends
function castSpells(computerSpell) {
  let playerSpell = null
  // splice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
  if (playerSpellIndex !== -1) {
    playerSpell = playerSpells[playerSpellIndex]
    playerSpells.splice(playerSpellIndex, 1)
    playerSpellIndex = -1
    // Dim the spell after it casts, when the countdown ends
    const indicator = document.querySelector('#player-' + playerSpell.name)
    indicator.classList.toggle('used', true)
  }

  // Put up both shields before applying either attack
  if (playerSpell && playerSpell.shieldRounds) {
    playerEffects.shieldRounds = playerSpell.shieldRounds
  }
  if (computerSpell && computerSpell.shieldRounds) {
    enemyEffects.shieldRounds = computerSpell.shieldRounds
  }

  const playerHit = resolveDamage(playerEffects, computerSpell)
  const enemyHit = resolveDamage(enemyEffects, playerSpell)
  playerHp = playerHp - playerHit.damage
  enemyHp = enemyHp - enemyHit.damage

  let playerHealing = 0
  let enemyHealing = 0
  if (playerSpell) {
    playerHealing = playerSpell.healing
    playerHp = playerHp + playerHealing
  }

  if (computerSpell) {
    enemyHealing = computerSpell.healing
    enemyHp = enemyHp + enemyHealing
    enemySpells.splice(0, 1)
    const indicator = document.querySelector('#enemy-' + computerSpell.name)
    indicator.classList.toggle('used', true)
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
  playerBurnBadge.classList.toggle('active', !duelEnded && playerEffects.burnDamage > 0)
  playerWetBadge.classList.toggle('active', !duelEnded && playerEffects.wet)
  playerShieldBadge.classList.toggle('active', !duelEnded && playerEffects.shieldRounds > 0)
  enemyBurnBadge.classList.toggle('active', !duelEnded && enemyEffects.burnDamage > 0)
  enemyWetBadge.classList.toggle('active', !duelEnded && enemyEffects.wet)
  enemyShieldBadge.classList.toggle('active', !duelEnded && enemyEffects.shieldRounds > 0)
  showRoundResult(playerRoundResult, playerHit, playerHealing)
  showRoundResult(enemyRoundResult, enemyHit, enemyHealing)
}

// Count down once a second and start the next round at zero
function startTimer() {
  let timeLeft = 3
  // The computer chooses its first available spell at the start of each round
  let computerSpell = enemySpells[0]
  timer.textContent = timeLeft

  // setInterval: https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
  const countdown = setInterval(() => {
    timeLeft = timeLeft - 1
    timer.textContent = timeLeft

    if (timeLeft === 0) {
      castSpells(computerSpell)
      spell.value = ''

      if (playerHp === 0 || enemyHp === 0) {
        // clearInterval: https://developer.mozilla.org/en-US/docs/Web/API/Window/clearInterval
        clearInterval(countdown)
        spell.disabled = true
        return
      }

      computerSpell = enemySpells[0]
      timeLeft = 3
      timer.textContent = timeLeft
      // Allow typing again when the next round starts
      spell.disabled = false
      spell.focus()
    }
  }, 1000)
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
  startTimer()
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
      // Lock the spell until the countdown ends.
      playerSpellIndex = index
      spell.disabled = true
      return
    }
  }
})
