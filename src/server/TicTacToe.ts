import { Client, matchMaker, Room } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Message } from '../types/messages'
import TicTacToeState from './TicTacToeState'
import PlayerSelectionCommand from './commands/PlayerSelectionCommand'
import { GameState } from '../types/ITicTacToeState'

export default class eqTicTacToe extends Room<TicTacToeState>
{
	private dispatcher = new Dispatcher(this)
	private isBot: boolean = false;

	onCreate(options: { isBot: boolean, isRoomFull: boolean })
	{
		if(!options.isRoomFull)
		{
			this.isBot = options.isBot || false
			this.maxClients = 2
			this.setState(new TicTacToeState())

			this.onMessage(Message.PlayerSelection, (client, message: { index: number, isBotTurn: boolean }) => {
				this.dispatcher.dispatch(new PlayerSelectionCommand(), {
					client,
					index: message.index,
					isBot: this.isBot,
					isCurrentPlayerBot: message.isBotTurn
				})
			})

			this.onMessage(Message.FinishGame, (client) => {
            	this.state.gameState = GameState.Finished;
        	});
		}
	}

	onJoin(client: Client)
	{
		const idx = this.clients.findIndex(c => c.sessionId === client.sessionId)
		client.send(Message.PlayerIndex, { playerIndex: idx })

		if(this.isBot)
		{
			this.state.gameState = GameState.Playing
			this.lock()
		} 
		else
		{
			if (this.clients.length >= 2)
			{
				this.state.gameState = GameState.Playing
				this.lock()
			}
		}
	}

	onLeave(client: Client, consented?: boolean | undefined): void | Promise<any> {
		this.state.gameState = GameState.Finished;
		this.broadcast(Message.PlayerDisconnected, { playerIndex: client.id })
	}
}

interface MatchEndData {
    event_type: string;
    datetime: string;
    winner: string;
    player1Score?: number;
    player2Score?: number;
}

interface PostRequestPayload {
    token: string;
    event_type: string;
    message: string;
    data: MatchEndData;
}
