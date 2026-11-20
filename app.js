//_Constants______________________________________
const command = document.querySelector('#command')
const message = document.querySelector('#message')
const startWord = document.querySelector('#start-word')
const menu = document.querySelector('#menu')
const arena = document.querySelector('#arena')
const spell = document.querySelector('#spell')
const enemyHpDisplay = document.querySelector('#enemy-hp')

//_Variables______________________________________
let enemyHp = 10

//_Functions______________________________________
function isStartCommand() {
  return command.value.trim().toLowerCase() === 'start'
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
