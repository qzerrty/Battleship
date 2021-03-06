const GameParams = {
  fieldSize: { width: 10, height: 10 },
  ships: [
    { id: 0, name: 'Aircraft Carriers', count: 1 },
    { id: 1, name: 'Missile Cruisers',  count: 2 },
    { id: 2, name: 'Destroyers',        count: 3 },
    { id: 3, name: 'Frigates',          count: 4 }
  ],
  codeClass: ['empty', 'ship', 'miss', 'hit', 'destroyed-ship', 'blocked']
}

const getRect = (x, y, w, h) => {
  let arr = []
  for (let i = x; i < x + w && i < GameParams.fieldSize.width; i++) {
    if (i < 0) continue;
    for (let j = y; j < y + h && j < GameParams.fieldSize.height; j++) {
      if (j < 0) continue;
      arr.push({x: i, y: j})
    }
  }

  return arr
}

const clearHoveredCells = () => {
  document.querySelectorAll('.field.player .cell.ship:not([data-ship])').forEach(cell => {
    cell.classList.replace('ship', 'empty')
  })
}

const clearField = () => {
  document.querySelectorAll('.field.player .cell.ship:not([data-ship])').forEach(cell => {
    cell.classList.replace('ship', 'empty')
  })
}

const getRandomNumber = (min, max) => {
  return Math.floor(min + Math.random() * (max + 1 - min));
}

export class Game {

  constructor() {
    this.playerField = document.querySelectorAll('.field')[0]
    this.enemyField = document.querySelectorAll('.field')[1]
    this.shipMenu = document.querySelector('.ship-menu')
    this.ctrlBtn = document.createElement('button')
    this.windows = document.querySelectorAll('.field-window')

    this.shipRotation = true // true - vertical, false - horizontal
    this.possibleToPlaceShip = false
    this.choosenShip = null

    this.resetBtn = document.createElement('button')
    this.resetBtn.innerHTML = 'Reset'
    this.resetBtn.classList.add('reset')
    this.resetBtn.addEventListener('click', this.reset)

    this.randomizeBtn = document.createElement('button')
    this.randomizeBtn.innerHTML = 'Randomize'
    this.randomizeBtn.classList.add('reset')
    this.randomizeBtn.addEventListener('click', this.randomizeShipPlacement)

    this.playerLosses = document.querySelector('#playerlosses')
    this.opponentLosses = document.querySelector('#opponentlosses')
    this.destroyedShips = {
      players: [],
      opponents: []
    }
  }

  init(
    playerField,
    opponentField,
    startedCallback,
    callback,
    makeStep
  ) {
    this.gameStarted = startedCallback
    this.makeStep = makeStep

    this.ctrlBtn.innerHTML = 'Rotate ship'
    this.ctrlBtn.addEventListener('click', this.changeRotation)

    for (let i = 0; i < 100; i++) {
      this.playerField.innerHTML +=
        `<div class="cell ${GameParams.codeClass[playerField[i]]}"
          data-x="${i % 10}" data-y="${Math.floor(i / 10)}" ${playerField[i] == 1 ? "data-ship" : ""}>
        </div>`
      this.enemyField.innerHTML +=
        `<div class="cell ${GameParams.codeClass[opponentField[i]]}" data-x="${i % 10}" data-y="${Math.floor(i / 10)}"></div>`
    }
    this.cells = document.querySelectorAll('.field.player .cell')
    this.checkOpponentField()
    this.checkPlayerField()

    if (playerField.search(/[^0]/) == -1) {
      this.ships = GameParams.ships.map(ship => { return { id: ship.id, count: ship.count } })
    } else {

      // IF GAME HAVE ALREADY STARTED

      this.ships = []
      this.windows[0].style['height'] = '0'
      this.prepareEnemyField()
    }

    this.playerField.addEventListener('mouseout', clearField)
    this.renderShipMenu()

    this.playerField.addEventListener('click', this.handleShipPlacement)

    callback()
  }

  handleShipPlacement = event => {
    if (this.choosenShip !== null && this.possibleToPlaceShip && event.target.classList.contains('cell')) {
      const target = event.target
  
      if (this.shipRotation) {
        for (let i = (+target.dataset.y); i < (+target.dataset.y) + this.choosenShip.length; i++) {
          this.cells[(+target.dataset.x) + i * 10].classList.replace('empty', 'ship')
          this.cells[(+target.dataset.x) + i * 10].dataset.ship = ""
        }
      } else {
        for (let i = (+target.dataset.x); i < (+target.dataset.x) + this.choosenShip.length; i++) {
          this.cells[(+target.dataset.y) * 10 + i].classList.replace('empty', 'ship')
          this.cells[(+target.dataset.y) * 10 + i].dataset.ship = ""
        }
      }
  
      this.ships[
        this.ships.findIndex(ship => ship.id === +this.choosenShip.id)
      ].count--
      this.ships = this.ships.filter(ship => ship.count > 0)
      this.choosenShip = null
      this.cells.forEach(cell => {
        cell.removeEventListener('mouseover', this.hoverFieldPlacement)
        cell.removeEventListener('mouseout', clearHoveredCells)
      })
      this.playerField.style['cursor'] = "auto"
      this.renderShipMenu()
      if (this.ships.length === 0) {
        this.windows[0].childNodes[1].style['display'] = 'none'
        this.windows[0].style['height'] = 'auto'
      }
    }
  }

  handleShipChoose = event => {
    const id = event.target.dataset.id
    document
      .querySelectorAll('.field-window ul li.active')
      .forEach(active => active.classList.remove('active'))
  
    if (this.choosenShip === null || this.choosenShip.id !== id) {
      event.target.classList.add('active')
      this.choosenShip = {}
      this.choosenShip.id = id
      this.choosenShip.length = 4 - id
  
      this.cells.forEach(cell => {
        cell.addEventListener('mouseover', this.hoverFieldPlacement)
        cell.addEventListener('mouseout', clearHoveredCells)
      })
      this.playerField.style['cursor'] = "url('static/images/ship-place.png') 23 30, auto"
    } else {
      this.choosenShip = null
      this.cells.forEach(cell => {
        cell.removeEventListener('mouseover', this.hoverFieldPlacement)
        cell.removeEventListener('mouseout', clearHoveredCells)
      })
      this.playerField.style['cursor'] = "auto"
    }
  }

  hoverFieldPlacement = event => {
    const target = event.target
  
    if (this.shipRotation) {
      if (
        10 - target.dataset.y >= this.choosenShip.length &&
        this.checkNearestShips((+target.dataset.x), (+target.dataset.y))
      ) {
        for (let i = (+target.dataset.y); i < (+target.dataset.y) + this.choosenShip.length; i++) {
          this.cells[i * 10 + (+target.dataset.x)].classList.replace('empty', 'ship')
        }
      } else this.possibleToPlaceShip = false
    } else {
      if (
        10 - target.dataset.x >= this.choosenShip.length &&
        this.checkNearestShips((+target.dataset.x), (+target.dataset.y))
      ) {
        for (let i = (+target.dataset.x); i < (+target.dataset.x) + this.choosenShip.length; i++) {
          this.cells[i + (+target.dataset.y) * 10].classList.replace('empty', 'ship')
        }
      } else this.possibleToPlaceShip = false
    }
  }

  checkNearestShips = (x, y) => {
    this.possibleToPlaceShip = true
    if (this.shipRotation) {
      getRect(x - 1, y - 1, 3, this.choosenShip.length + 2).forEach(cell => {
        if (this.cells[cell.x + cell.y * GameParams.fieldSize.width].dataset.ship !== undefined) {
          this.possibleToPlaceShip = false
          return
        }
      })
    } else {
      getRect(x - 1, y - 1, this.choosenShip.length + 2, 3).forEach(cell => {
        if (this.cells[cell.x + cell.y * GameParams.fieldSize.width].dataset.ship !== undefined) {
          this.possibleToPlaceShip = false
          return
        }
      })
    }
  
    return this.possibleToPlaceShip
  }

  changeRotation = () => {
    this.shipRotation = !this.shipRotation
  }

  renderShipMenu = () => {
    if (this.ships.length === 0) {
      this.shipMenu.innerHTML = ''
      this.ctrlBtn.innerHTML  = 'Start Game'
      this.ctrlBtn.removeEventListener('click', this.changeRotation)
      this.ctrlBtn.addEventListener('click', this.startGame)

      // this.shipMenu.appendChild(this.resetBtn)
      this.shipMenu.appendChild(this.ctrlBtn)
    } else {
      this.shipMenu.innerHTML = '<ul>' +
        this.ships
            .map(ship => `<li data-id="${ship.id}">
              ${GameParams.ships[ship.id].name}${(ship.count > 1) ? ` x${ship.count}` : ''}
            </li>`)
            .join('')
        + '</ul>'
  
      this.shipMenu.appendChild(this.ctrlBtn)
      this.shipMenu.appendChild(this.randomizeBtn)
  
      document.querySelectorAll('.field-window ul li').forEach(ship => {
        ship.addEventListener('click', this.handleShipChoose)
      })
    }
  }

  checkOpponentField = () => {
    document.querySelectorAll('.field.enemy .cell.destroyed-ship').forEach(cell => {
      getRect(+cell.dataset.x - 1, +cell.dataset.y - 1, 3, 3).forEach(coords => {
        const i = coords.x + coords.y * GameParams.fieldSize.width
        document.querySelectorAll('.field.enemy .cell')[i].classList.replace('empty', 'blocked')
      })
    })
  }

  checkPlayerField = () => {
    document.querySelectorAll('.field.player .cell.destroyed-ship').forEach(cell => {
      getRect(+cell.dataset.x - 1, +cell.dataset.y - 1, 3, 3).forEach(coords => {
        const i = coords.x + coords.y * GameParams.fieldSize.width
        document.querySelectorAll('.field.player .cell')[i].classList.replace('empty', 'blocked')
      })
    })
  }

  startGame = () => {
    this.windows[0].style['height'] = '0'
    this.gameStarted(Array.from(
        document
          .querySelectorAll('.field.player .cell'))
          .map(cell => GameParams.codeClass.indexOf(cell.className.split(' ')[1])
      ).join(''))

    this.prepareEnemyField()
  }

  reset = () => {
    document
      .querySelectorAll('.field.player .cell')
      .forEach(cell => cell.className = 'cell empty')
    this.possibleToPlaceShip = false
    this.choosenShip = null
    this.ships = GameParams.ships.map(ship => { return { id: ship.id, count: ship.count } })

    this.windows[0].childNodes[1].style['display'] = 'block'
    this.windows[0].style['height'] = '430px'
    this.renderShipMenu()
  }

  clickCellListener = event => {
    if (
      event.target.classList.contains('cell')
      && event.target.classList.contains('empty')
    ) this.makeStep(event.target.dataset)
  }

  prepareEnemyField = () => {
    this.enemyField.addEventListener('click', this.clickCellListener)
  }

  changeEnemyCellClass = (x, y, classCode) => {
    const cell = document.querySelectorAll('.field.enemy .cell')[x + y * GameParams.fieldSize.width]
    cell.className = `cell ${GameParams.codeClass[classCode]}`
  }

  changeCellClass = (x, y, classCode) => {
    this.cells[x + y * GameParams.fieldSize.width].className =
      `cell ${GameParams.codeClass[classCode]}`
  }

  randomizeShipPlacement = () => {
    while (this.ships.length !== 0) {
      document.querySelector('.ship-menu ul li').click()
      const cell = this.cells[getRandomNumber(0, GameParams.fieldSize.width * GameParams.fieldSize.height - 1)]
      cell.dispatchEvent(new Event('mouseover'))
      if (this.possibleToPlaceShip) {
        cell.click()
      } else {
        this.changeRotation()
        cell.dispatchEvent(new Event('mouseover'))
        cell.click()
      }
    }
  }

  renderPlayerLosses = () => {
    this.playerLosses.innerHTML =
      this.destroyedShips.players.map(s => `<p>${s.name}${s.count > 1 ? ' x' + s.count : ''}</p>`).join('')
  }

  renderOpponentLosses = () => {
    this.opponentLosses.innerHTML =
      this.destroyedShips.opponents.map(s => `<p>${s.name}${s.count > 1 ? ' x' + s.count : ''}</p>`).join('')
  }

  addPlayerLosses = (lengthOfShip) => {
    let shipName = GameParams.ships[4 - lengthOfShip].name
    for (let sh of this.destroyedShips.players) {
      if (sh.name === shipName) {
        sh.count++
        return
      }
    }
    this.destroyedShips.players.push({name: shipName, count: 1})
    this.renderPlayerLosses()
  }
  
  addOpponentLosses = (lengthOfShip) => {
    let shipName = GameParams.ships[4 - lengthOfShip].name
    for (let sh of this.destroyedShips.opponents) {
      if (sh.name === shipName) {
        sh.count++
        return
      }
    }
    this.destroyedShips.opponents.push({name: shipName, count: 1})
    this.renderOpponentLosses()
  }
}