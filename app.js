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

// Count down once a second and stop at zero.
function startTimer() {
  let timeLeft = 5
  timer.textContent = timeLeft

  // setInterval: https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
  const countdown = setInterval(() => {
    timeLeft = timeLeft - 1
    timer.textContent = timeLeft

  // clearInterval: https://developer.mozilla.org/en-US/docs/Web/API/Window/clearInterval
    if (timeLeft === 0) {
      clearInterval(countdown)
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

  if (spell.value.trim().toLowerCase() === 'fire' && enemyHp > 0) {
    enemyHp = enemyHp - 1
    enemyHpDisplay.textContent = enemyHp
    spell.value = ''
  }
})
