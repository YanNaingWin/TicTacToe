import Phaser from 'phaser'
import { IGameOverSceneData } from '../../types/scenes'

export default class GameOver extends Phaser.Scene
{
	constructor()
	{
		super('game-over')
	}

	create(data: IGameOverSceneData)
	{
		let text = ""
		if (data.draw){
			text = 'Draw!'
		} else {
			text = data.winner
			? data.winnerId + ' Won!'
			: data.winnerId + ' Lost!'
		}

		const { width, height } = this.scale

		const title = this.add.text(width * 0.5, height * 0.5, text, {
			fontSize: '48px'
		})
		.setOrigin(0.5)
		.setColor('#636b77')
	}
}
