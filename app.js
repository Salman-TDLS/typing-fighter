//_Constants______________________________________
const command = document.querySelector('#command')
const message = document.querySelector('#message')
const startWord = document.querySelector('#start-word')
const menu = document.querySelector('#menu')
const arena = document.querySelector('#arena')
const spell = document.querySelector('#spell')
const enemyHpDisplay = document.querySelector('#enemy-hp')
const timer = document.querySelector('#timer')

//_Variables______________________________________
let enemyHp = 10

//_Functions______________________________________
function isStartCommand() {
  return command.value.trim().toLowerCase() === 'start'
}

// Count down once a second and start the next round at zero.
function startTimer() {
  let timeLeft = 3
  timer.textContent = timeLeft

  // setInterval: https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
  const countdown = setInterval(() => {
    timeLeft = timeLeft - 1
    timer.textContent = timeLeft

    if (timeLeft === 0) {
      // Cast the locked spell when the round ends.
      if (spell.disabled) {
        enemyHp = enemyHp - 1
        enemyHpDisplay.textContent = enemyHp
      }

      if (enemyHp === 0) {
        // clearInterval: https://developer.mozilla.org/en-US/docs/Web/API/Window/clearInterval
        clearInterval(countdown)
        return
      }

      timeLeft = 3
      timer.textContent = timeLeft
      spell.value = ''
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
  enemyHpDisplay.textContent = enemyHp
  startTimer()
  menu.hidden = true
  arena.hidden = false
  spell.focus()
})

document.querySelector('#spell-form').addEventListener('submit', (event) => {
  event.preventDefault()

  if (!spell.disabled && spell.value.trim().toLowerCase() === 'fire') {
    // Disable the spell box after a valid spell is submitted.
    spell.disabled = true
  }
})
