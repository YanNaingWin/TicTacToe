import { Command } from '@colyseus/command'
import { Client } from 'colyseus'
import ITicTacToeState, { Cell, GameState } from '../../types/ITicTacToeState'
import CheckWinnerCommand from './CheckWinnerCommand'

type Payload = {
	client: Client
	index: number
	isBot: boolean
	isCurrentPlayerBot: boolean
}

export default class PlayerSelectionCommand extends Command<ITicTacToeState, Payload>
{
	execute(data: Payload)
	{
		const { client, index } = data

		if (this.room.state.gameState !== GameState.Playing)
		{
			return
		}

		if(!data.isBot)
		{
			const clientIndex = this.room.clients.findIndex(c => c.id === client.id)
			if (clientIndex !== this.room.state.activePlayer)
			{
				return
			}
			const cellValue = clientIndex === 0 ? Cell.X : Cell.O
			this.room.state.board[index] = cellValue
		}

		else
		{
			if(!data.isCurrentPlayerBot)
			{
				const clientIndex = this.room.clients.findIndex(c => c.id === client.id)
				const cellValue = clientIndex === 0 ? Cell.X : Cell.O
				this.room.state.board[index] = cellValue
			}
			else
			{
				this.room.state.board[index] = Cell.O
			}
		}

		return [
			new CheckWinnerCommand()
		]
	}
}
