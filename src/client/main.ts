import 'regenerator-runtime/runtime'
import Phaser from 'phaser'

import Bootstrap from './scenes/Bootstrap'
import Game from './scenes/Game'
import GameOver from './scenes/GameOver'

const config: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: 600,
	height: 800,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { x: 0, y: 200 }
		}
	},
	scene: [Bootstrap, Game, GameOver],
	backgroundColor: '#f5f6e8'
}

export default new Phaser.Game(config)
