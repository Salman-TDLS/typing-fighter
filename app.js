//_Constants______________________________________
const command = document.querySelector('#command')
const message = document.querySelector('#message')
const startWord = document.querySelector('#start-word')
const menu = document.querySelector('#menu')
const arena = document.querySelector('#arena')
const spell = document.querySelector('#spell')
const playerHpDisplay = document.querySelector('#player-hp')
const enemyHpDisplay = document.querySelector('#enemy-hp')
const timer = document.querySelector('#timer')

// Both sides start with the spells in this list.
const spells = [
  { name: 'fire', damage: 1 }
]

//_Variables______________________________________
let playerHp = 10
let enemyHp = 10
// slice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
const playerSpells = spells.slice()
const enemySpells = spells.slice()
let playerSpellIndex = -1 // No spell is locked in yet.

//_Functions______________________________________
function isStartCommand() {
  return command.value.trim().toLowerCase() === 'start'
}

// Apply both spells when the countdown ends.
function castSpells(computerSpell) {
  // splice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
  if (playerSpellIndex !== -1) {
    enemyHp = enemyHp - playerSpells[playerSpellIndex].damage
    playerSpells.splice(playerSpellIndex, 1)
    playerSpellIndex = -1
  }

  if (computerSpell) {
    playerHp = playerHp - computerSpell.damage
    enemySpells.splice(0, 1)
  }

  playerHpDisplay.textContent = playerHp
  enemyHpDisplay.textContent = enemyHp
}

// Count down once a second and start the next round at zero.
function startTimer() {
  let timeLeft = 3
  // The computer chooses its first available spell at the start of each round.
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
      // Allow typing again when the next round starts.
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
