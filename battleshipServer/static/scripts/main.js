const disableGame = () => {
  document.querySelector('#wall').style['display'] = 'block'
}

const enableGame = () => {
  document.querySelector('#wall').style['display'] = 'none'
}

const changeStatus = (statusIconClass, statusQualityText) => {
  const status = document.querySelector('#connection .status')
  const quality = document.querySelector('#connection .quality')

  status.classList.add(statusIconClass)
  quality.innerHTML = statusQualityText
}

const openModal = (h3Text, pText, btnText, btnClickedFunc) => {
  document.querySelector('.modal-wrapper').style['display'] = 'flex'

  document.querySelector('.modal').innerHTML = 
   `<h3>${h3Text}</h3>
    <p>${pText}</p>
    <input type="button" class="styled-btn" value="${btnText}">`
  document.querySelector('.modal input[type=button]').addEventListener('click', btnClickedFunc)
}

const closeModal = () => {
  document.querySelector('.modal-wrapper').style['display'] = 'none'
}

if (localStorage.theme === 'dark') {
  const themeLink = document.querySelector('#current-theme')
  themeLink.href = themeLink.href.replace('light', 'dark')
}

import {Game} from './Game.js'
import {GameLog} from './GameLog.js'

const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value

const roomID = document.querySelector('[data-roomID]').value
const playerID = document.querySelector('[data-playerID]').value
let opponentID = undefined
let playerStatus = undefined

let socketMSG = {}
let waintingForResponseToStep = false

let game = new Game()
let loger = new GameLog('#gamelog')

let socket = new WebSocket(`ws://${window.location.host}/game/${roomID}`)

socket.onopen = event => {
  changeStatus('ok', 'Connection established')

  const initialMSG = {
    type: 'initial',
    playerID: playerID
  }

  socket.send(JSON.stringify(initialMSG))
}

socket.onmessage = event => {
  const response = JSON.parse(event.data)
  /*

      MODEL CHANGE MSG RESPONSE

  */
  if (response.type === 'modelChange') {
    if (response.opponent !== 'None' && opponentID === undefined) {
      opponentID = response.opponent
      openModal('You are not alone!',
          `Also in room: ${opponentID}`,
          'Ok :)',
          closeModal)
      enableGame()
    } else if (response.opponent === 'None' && opponentID !== undefined) {
      opponentID = undefined
      openModal('Opponent leaved',
          '',
          'Ok :(',
          closeModal)
      disableGame()
    }
    if (response.playerState === '400' && response.playerState !== playerStatus) {
      playerStatus = response.playerState
      loger.add('Your turn!')
    }
    if (response.diff !== undefined) {
      response.diff.forEach(diffCell => {
        game.changeCellClass(+diffCell[1] % 10, Math.floor(+diffCell[1] / 10), +diffCell[0])
      })
      // game.addPlayerLosses(response.diff.length)
      game.checkPlayerField()
    }
  }
  /* 

      STEP MSG RESPONSE

  */
  else if (response.type === 'step') {
    waintingForResponseToStep = false
    response.coords.forEach(coord => {
      game.changeEnemyCellClass(+coord.x, +coord.y, +response.classCode)
    })
    game.checkOpponentField()
    if (response.classCode === '3') {
      loger.add(`You hitted an enemy ship!`)
    } else if (response.classCode === '4') {
      // game.addOpponentLosses(response.coords.length)
      loger.add(`You destroyed an enemy ship!`)
    } else {
      loger.add(`You missed!`)
      playerStatus = '300'
    }
  }
  /* 

      INITIAL MSG RESPONSE

  */
  else if (response.type === 'initial') {
    game.init(
      response.playerField,
      response.opponentField,
      gameStart,
      disableGame,
      makeStep
    )
    if (response.opponent !== 'None' && opponentID === undefined) {
      opponentID = response.opponent
      openModal('You are not alone!',
          `Also in room: ${opponentID}`,
          'Ok :)',
          closeModal)
      enableGame()
    } else if (response.opponent === 'None' && opponentID !== undefined) {
      opponentID = undefined
      openModal('Opponent leaved',
          '',
          'Ok :(',
          closeModal)
      disableGame()
    }
  } 
  /* 

      WARNING MSG RESPONSE

  */
  else if (response.type === 'warning') {
    switch(response.code) {
      case 1: // room has been deleted
        changeStatus('bad', 'Connection lost')
        openModal('404',
          'Seems like host leaved the room and it has been deleted',
          'Return to lobby',
          sendDeleteRequest)
        break;
    }
  }
  /* 

      GOT MSG ABOUT WIN / LOSE

  */
  else if (response.type === 'theend') {
    const modalMSG = {}
    if (response.result === 'won') {
      modalMSG.title = 'Congratulations!'
      modalMSG.text = 'Obviously, you did it, you won!'
      modalMSG.btn = 'Thx'
    } else {
      modalMSG.title = 'Oh no...'
      modalMSG.text = 'Seems like you lost this game :('
      modalMSG.btn = `I'll try another time`
    }
    openModal(modalMSG.title,
          modalMSG.text,
          modalMSG.btn,
          closeModal)
    disableGame()
  }
}

socket.onclose = event => {
  changeStatus('bad', 'Connection lost')
}

socket.onerror = error => {
  console.error(`[WebSocket error] ${error.message}`)
}

const sendDeleteRequest = () => {
  let request = new Request(
    'quit',
    { headers: {'X-CSRFToken': csrftoken} }
  )

  fetch(request, {
    method: 'DELETE',
    mode: 'same-origin'
  }).then(response => {
    socketMSG = {
      type: 'notifyOpponent',
    }
    sendMessageToServer()

    document.location.replace(response.url)
  })
}
document.querySelector('#quit').addEventListener('click', sendDeleteRequest)

const sendMessageToServer = () => {
  socket.send(JSON.stringify(socketMSG))
  if (socketMSG.type !== 'check') {
    socketMSG = {type: 'check'}
  }
}

const gameStart = field => {
  socketMSG = {
    type: 'field',
    data: field
  }
  sendMessageToServer()
}

const makeStep = data => {
  if (!waintingForResponseToStep && playerStatus == '400') {
    waintingForResponseToStep = true
    socketMSG = {
      type: 'step',
      data: {x: data.x, y: data.y}
    }
    sendMessageToServer()
  }
}