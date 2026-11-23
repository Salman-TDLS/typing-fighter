//_Constants______________________________________
const command = document.querySelector('#command')
const message = document.querySelector('#message')
const startWord = document.querySelector('#start-word')
const menu = document.querySelector('#menu')
const arena = document.querySelector('#arena')
const arenaTitle = document.querySelector('#arena-title')
const playerFighter = document.querySelector('#player-fighter')
const enemyFighter = document.querySelector('#enemy-fighter')
const spellEffects = document.querySelector('#spell-effects')
const projectileDelay = 55
const spellImpactDelay = 255
const supportEffectDelay = 110
const supportImpactDelay = 530
const spellEffectsEnd = 830
const computerCastDelay = 850
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
const playerEffectPosition = {
  left: '27%', top: '58%', ground: '86%',
  burnBadge: playerBurnBadge, wetBadge: playerWetBadge, shieldBadge: playerShieldBadge,
  shieldPosition: { left: '40.4%', top: '65.2%', ground: '86%', width: '14%' }
}
const enemyEffectPosition = {
  left: '70%', top: '47%', ground: '65%',
  burnBadge: enemyBurnBadge, wetBadge: enemyWetBadge, shieldBadge: enemyShieldBadge,
  shieldPosition: { left: '60.8%', top: '50.4%', ground: '65%', width: '9.7%' }
}
const playerRoundResult = document.querySelector('#player-round-result')
const enemyRoundResult = document.querySelector('#enemy-round-result')
const startingHp = 5

// Damage lowers the opponent's HP. Healing raises the caster's HP
const fire = { name: 'fire', damage: 1, healing: 0, burnDamage: 1 }
const air = { name: 'air', damage: 1, healing: 0 }
const electric = { name: 'electric', damage: 1, healing: 0, wetBonusDamage: 1 }
const water = { name: 'water', damage: 1, healing: 0, breaksShield: true }
const rock = { name: 'rock', damage: 0, healing: 0, shieldRounds: 2 }
const cure = { name: 'cure', damage: 0, healing: 1 }
const spells = [fire, air, electric, water, rock, cure]

// The computer uses one of these spell orders per duel
const computerSpellOrders = [
  [fire, air, rock, water, electric, cure], // Burn combo first
  [water, electric, fire, air, rock, cure], // Wet combo first
  [rock, water, electric, cure, fire, air], // Shield first
  [air, cure, rock, water, electric, fire], // Heal early
  [electric, fire, air, cure, rock, water] // Attack first
]

//_Variables______________________________________
let playerHp
let enemyHp
let playerEffects
let enemyEffects
let playerSpells
let enemySpells
let lastComputerOrder = -1
const shieldRemovalTimers = []

//_Functions______________________________________

//_Spell rules____________________________________
// Work out one side's incoming damage and its effects for the next round
function resolveDamage(effects, incomingSpell) {
  // Wet and burn from the previous round expire after this round
  const wasWet = effects.wet
  const burnDamage = effects.burnDamage
  let reason = ''
  let impact = ''
  effects.wet = false
  effects.burnDamage = 0

  // Water breaks a shield or makes an unshielded target wet next round
  if (incomingSpell && incomingSpell.breaksShield) {
    if (effects.shieldRounds > 0) {
      effects.shieldRounds = 0
      reason = 'Shield broken'
      impact = 'shield-break'
    } else if (burnDamage === 0) {
      effects.wet = true
    }
    // Water puts out Burn for zero damage and leaves the target dry.
    if (burnDamage > 0) {
      return { damage: 0, reason: 'Burn extinguished', impact: 'steam' }
    }
  }

  // An active shield blocks damage
  if (effects.shieldRounds > 0) {
    if (burnDamage > 0 || (incomingSpell && incomingSpell.damage > 0)) {
      reason = 'Shield blocked the hit'
      impact = 'shield-block'
    }
    return { damage: 0, reason: reason, impact: impact }
  }

  if (!incomingSpell) {
    if (burnDamage > 0) {
      reason = 'Burn'
      impact = 'burn'
    }
    return { damage: burnDamage, reason: reason, impact: impact }
  }

  // Fire uses up Wet for zero damage.
  if (wasWet && incomingSpell.name === 'fire') {
    return { damage: 0, reason: 'Fire cleared Wet', impact: 'steam' }
  }

  let damage = incomingSpell.damage
  if (incomingSpell.damage > 0 && reason === '') {
    reason = incomingSpell.name[0].toUpperCase() + incomingSpell.name.slice(1)
    impact = incomingSpell.name
  }
  if (incomingSpell.burnDamage) {
    effects.burnDamage = incomingSpell.burnDamage
  }
  if (wasWet && incomingSpell.wetBonusDamage) {
    damage = damage + incomingSpell.wetBonusDamage
    reason = 'Electric + Wet'
    impact = 'shock'
  }
  // Electric skips the pending Burn damage.
  if (burnDamage > 0 && incomingSpell.name !== 'electric') {
    damage = damage + burnDamage
    if (reason === '') {
      reason = 'Burn'
    } else {
      reason = reason + ' + Burn'
    }
    if (incomingSpell.name === 'air') {
      impact = 'firestorm'
    } else if (impact === '') {
      impact = 'burn'
    }
  }
  return { damage: damage, reason: reason, impact: impact }
}

//_Duel flow______________________________________
function isStartCommand() {
  return command.value.trim().toLowerCase() === 'start'
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

  // Pick from all five orders at first, then leave out the last one
  let orderCount = computerSpellOrders.length
  if (lastComputerOrder >= 0) {
    orderCount = orderCount - 1
  }

  // Math.random: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
  // Math.floor: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor
  let orderIndex = Math.floor(Math.random() * orderCount)
  // Skip the position of the previous order
  if (lastComputerOrder >= 0 && orderIndex >= lastComputerOrder) {
    orderIndex = orderIndex + 1
  }
  lastComputerOrder = orderIndex
  enemySpells = computerSpellOrders[orderIndex].slice()

  // classList: https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
  arenaTitle.classList.remove('result-win', 'result-loss', 'result-draw')
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
  const playerShielded = playerEffects.shieldRounds > 0
  const enemyStartedShielded = enemyEffects.shieldRounds > 0
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

  const enemyShielded = enemyStartedShielded || enemyEffects.shieldRounds > 0

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
  let animationEnd = spellEffectsEnd
  if (computerSpell) {
    animationEnd = computerCastDelay + spellEffectsEnd
  }
  let playerShieldEnd = animationEnd
  let enemyShieldEnd = animationEnd
  if (computerSpell && computerSpell.breaksShield) {
    playerShieldEnd = computerCastDelay + spellImpactDelay
  }
  if (enemyStartedShielded && playerSpell.breaksShield) {
    enemyShieldEnd = spellImpactDelay
  }
  keepShieldVisible(playerShieldBadge, playerShielded, playerShieldEnd)
  keepShieldVisible(enemyShieldBadge, enemyShielded, enemyShieldEnd)

  animateFighter(playerFighter, 'cast', 0)
  if (enemyHit.damage > 0) {
    animateFighter(enemyFighter, 'hit', getImpactDelay(playerSpell))
  }
  if (computerSpell) {
    animateFighter(enemyFighter, 'cast', computerCastDelay)
  }
  if (playerHit.damage > 0) {
    animateFighter(playerFighter, 'hit', computerCastDelay + getImpactDelay(computerSpell))
  }
  // Play each cast on its own turn and show matching combos once.
  showSpellEffects(playerSpell, enemyHit, playerEffectPosition, enemyEffectPosition, 0)
  if (enemyHit.impact !== playerHit.impact || !isComboEffect(enemyHit.impact)) {
    showSpellEffects(computerSpell, playerHit, enemyEffectPosition, playerEffectPosition, computerCastDelay)
  }
  if (duelEnded) {
    // Let the last hit frames finish before the ending animation.
    animateDuelEnd(animationEnd + 180)
  }
}

// The side with more HP wins. Equal HP is a draw
function showDuelResult() {
  if (playerHp > enemyHp) {
    arenaTitle.textContent = 'You win'
    arenaTitle.classList.add('result-win')
  } else if (playerHp < enemyHp) {
    arenaTitle.textContent = 'You lose'
    arenaTitle.classList.add('result-loss')
  } else {
    arenaTitle.textContent = 'Draw'
    arenaTitle.classList.add('result-draw')
  }
}

//_HUD and feedback_______________________________
// Show what changed HP in the round that just ended
function showRoundResult(display, hit, healing) {
  let text = hit.reason
  if (hit.damage > 0) {
    text = '-' + hit.damage + ' HP · ' + text
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

// Show one filled heart per HP and outline the missing hearts
function showHearts(display, hp, fighterName) {
  display.textContent = ''
  let heartSlots = startingHp
  if (hp > heartSlots) {
    heartSlots = hp
  }

  for (let index = 0; index < heartSlots; index = index + 1) {
    // createElement: https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement
    const heart = document.createElement('img')
    if (index < hp) {
      heart.src = 'assets/icons/heart-full.png'
    } else {
      heart.src = 'assets/icons/heart-empty.png'
    }
    heart.alt = ''
    // appendChild: https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild
    display.appendChild(heart)
  }

  // setAttribute: https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
  display.setAttribute('aria-label', fighterName + ' has ' + hp + ' health points')
}

// Keep the HUD icon and the matching battlefield effect in sync
function showStatus(badge, active) {
  const visual = document.querySelector('#' + badge.id + '-visual')
  badge.classList.toggle('active', active)
  visual.hidden = !active
}

// Update HP, effects, and which control the player can use
function updateDuelDisplay(duelEnded) {
  showHearts(playerHpDisplay, playerHp, 'Player')
  showHearts(enemyHpDisplay, enemyHp, 'Enemy')
  spell.disabled = duelEnded
  restartButton.hidden = !duelEnded

  showStatus(playerBurnBadge, !duelEnded && playerEffects.burnDamage > 0)
  showStatus(playerWetBadge, !duelEnded && playerEffects.wet)
  showStatus(playerShieldBadge, !duelEnded && playerEffects.shieldRounds > 0)
  showStatus(enemyBurnBadge, !duelEnded && enemyEffects.burnDamage > 0)
  showStatus(enemyWetBadge, !duelEnded && enemyEffects.wet)
  showStatus(enemyShieldBadge, !duelEnded && enemyEffects.shieldRounds > 0)
}

//_Animations_____________________________________
// Stop any animation left over when a new round or duel starts
// getAnimations: https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations
function clearBattleAnimations() {
  spellEffects.textContent = ''
  // clearTimeout: https://developer.mozilla.org/en-US/docs/Web/API/Window/clearTimeout
  for (const timer of shieldRemovalTimers) {
    clearTimeout(timer)
  }
  shieldRemovalTimers.length = 0
  for (const fighter of [playerFighter, enemyFighter]) {
    for (const animation of fighter.getAnimations()) {
      // animation.cancel: https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel
      animation.cancel()
    }
  }
}

// Keep a shield visible until it breaks or the round's animations end
// setTimeout: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
function keepShieldVisible(badge, shieldedThisRound, removeAfter) {
  // matchMedia: https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia
  if (!shieldedThisRound || badge.classList.contains('active') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  showStatus(badge, true)
  const timer = setTimeout(() => showStatus(badge, false), removeAfter)
  shieldRemovalTimers.push(timer)
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
  ], { duration: 460, delay: delay, easing: 'steps(8, jump-none)' })
}

// After the final spell, lift the winner and drop the loser toward the ground.
// fill: https://developer.mozilla.org/en-US/docs/Web/API/KeyframeEffect/KeyframeEffect#fill
// transform: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform
function animateDuelEnd(delay) {
  if (playerHp === enemyHp || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  let winner = playerFighter
  let loser = enemyFighter
  if (playerHp < enemyHp) {
    winner = enemyFighter
    loser = playerFighter
  }

  winner.animate([
    { transform: 'translateY(0)' },
    { transform: 'translateY(-30%)' }
  ], { duration: 700, delay: delay, easing: 'ease-out', fill: 'forwards' })

  loser.animate([
    { transform: 'translateY(0) rotate(0)', opacity: 1 },
    { transform: 'translateY(24%) rotate(-24deg)', opacity: 0.55 }
  ], { duration: 560, delay: delay, easing: 'ease-in', fill: 'forwards' })
}

// Step through the effect frames before showing the status it applies.
function animateSpellEffect(name, from, to, delay, duration, onGround, statusBadge) {
  const revealStatus = statusBadge && statusBadge.classList.contains('active')
  if (revealStatus) {
    showStatus(statusBadge, false)
  }

  const effect = document.createElement('div')
  effect.classList.add('spell-effect')
  if (from === enemyEffectPosition || from === enemyEffectPosition.shieldPosition) {
    effect.classList.add('enemy-spell-effect')
  }
  if (name === 'cure') {
    effect.classList.add('cure-effect')
  }
  effect.style.backgroundImage = 'url(assets/spells/' + name + '.webp)'
  let startTop = from.top
  let endTop = to.top
  if (onGround) {
    startTop = from.ground
    endTop = to.ground
    effect.classList.add('ground-effect')
  }
  effect.style.left = from.left
  effect.style.top = startTop
  if (from.width && !onGround) {
    effect.style.width = from.width
  }
  if (from !== to) {
    effect.classList.add('spell-projectile')
    if (from === enemyEffectPosition) {
      effect.style.transform = 'scaleX(-1)'
    }
  }
  spellEffects.appendChild(effect)

  const animation = effect.animate([
    { backgroundPositionX: '0%', opacity: 1 },
    { backgroundPositionX: '100%', opacity: 1 }
  ], { delay: delay, duration: duration, easing: 'steps(12, jump-none)' })

  // Projectiles travel smoothly while their own frames change.
  if (from !== to) {
    effect.animate([
      { left: from.left, top: startTop },
      { left: to.left, top: endTop }
    ], { delay: delay, duration: duration })
  }

  // finish: https://developer.mozilla.org/en-US/docs/Web/API/Animation/finish_event
  animation.addEventListener('finish', () => {
    // A restart or a new round clears effects before they can reveal a status.
    if (effect.parentElement === spellEffects) {
      effect.remove()
      if (revealStatus) {
        showStatus(statusBadge, true)
      }
    }
  })
}

function isGroundEffect(name) {
  return name === 'water' || name === 'shock' || name === 'steam' || name === 'shield-break'
}

function isComboEffect(name) {
  return name === 'firestorm' || name === 'shock' || name === 'steam' || name === 'shield-break'
}

function isSupportSpell(cast) {
  return cast && (cast.healing || cast.shieldRounds)
}

function getImpactDelay(cast) {
  if (isSupportSpell(cast)) {
    return supportImpactDelay
  }
  return spellImpactDelay
}

// Fire and Water affect the target, while Rock shields its caster.
function getSpellStatus(cast, caster, target) {
  if (!cast) {
    return
  }
  if (cast.burnDamage) {
    return target.burnBadge
  }
  if (cast.breaksShield) {
    return target.wetBadge
  }
  if (cast.shieldRounds) {
    return caster.shieldBadge
  }
}

// Show the cast from its caster and the result on the target.
function showSpellEffects(cast, hit, caster, target, delay) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const impactDelay = getImpactDelay(cast)
  const supportSpell = isSupportSpell(cast)
  const statusBadge = getSpellStatus(cast, caster, target)
  if (hit.impact) {
    let position = target
    if (hit.impact === 'shield-block' || hit.impact === 'shield-break') {
      position = target.shieldPosition
    }
    // Rock reveals the caster's shield when Rock's own animation ends.
    let impactBadge
    if (!supportSpell) {
      impactBadge = statusBadge
    }
    animateSpellEffect(hit.impact, position, position, delay + impactDelay,
      spellEffectsEnd - impactDelay, isGroundEffect(hit.impact), impactBadge)
  }

  // The combo already shows the whole hit, so it uses one effect.
  if (isComboEffect(hit.impact)) {
    return
  }

  if (supportSpell) {
    let duration = 580
    let position = caster
    if (hit.impact) {
      duration = impactDelay - supportEffectDelay
    }
    if (cast.shieldRounds) {
      position = caster.shieldPosition
    }
    animateSpellEffect(cast.name, position, position, delay + supportEffectDelay, duration,
      false, statusBadge)
  } else if (cast && cast.name !== 'electric') {
    animateSpellEffect(cast.name + '-projectile', caster, target, delay + projectileDelay,
      spellImpactDelay - projectileDelay, false)
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