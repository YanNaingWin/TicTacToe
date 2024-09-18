import { Client, Room } from 'colyseus.js'
import Phaser from 'phaser'
import ITicTacToeState, { GameState } from '../../types/ITicTacToeState'
import { Message } from '../../types/messages'
import { matchMaker } from 'colyseus'

export default class Server
{
	private client: Client
	private events: Phaser.Events.EventEmitter

	private room?: Room<ITicTacToeState>
	private _playerIndex = -1
	private _playerId: string = ''
	private _gameDraw = 0
	private _player1Score = 0
	private token: string = ''
	private isBot: boolean = false

	get playerIndex()
	{
		return this._playerIndex
	}

	get playerId()
	{
		return this._playerId
	}

	get gameState()
	{
		if (!this.room)
		{
			return GameState.WaitingForPlayers
		}

		return this.room?.state.gameState
	}

	get gameDraw()
	{
		return this._gameDraw
	}

	setGameStateFinished()
	{
		this.room?.send(Message.FinishGame)
	}

	get player1Score()
	{
		return this._player1Score += 1
	}

	constructor()
	{
		this.client = new Client('wss://tictactoe-yrhq.onrender.com')
		this.events = new Phaser.Events.EventEmitter()
	}

	async createRoom(matchId: string, isBot: boolean, token: string) {
		this.token = token
		this.isBot = isBot
		const body = {
			isBot: isBot
		}
        try {
            const response = await fetch(`https://tictactoe-yrhq.onrender.com/create-room/${matchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
				body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Error creating room: ${response.statusText}`);
            }

        } catch (error) {
            console.error(`Failed to create room: ${(error as Error).message}`);
        }
    }

	async join(matchId: string, player1Id: string, player2Id: string)
	{
		this.room = await this.client.joinOrCreate<ITicTacToeState>(matchId)
		this.room.onMessage(Message.PlayerIndex, (message: { playerIndex: number }) => {
			this._playerIndex = message.playerIndex
			if(this._playerIndex === 0)
			{
				this._playerId = player1Id
			}
			else
			{
				this._playerId = player2Id
			}
		})

		this.room.onStateChange.once(state => {
			this.events.emit('once-state-changed', state)
		})

		this.room.state.onChange = (changes) => {
			changes.forEach(change => {
				const { field, value } = change

				switch (field)
				{
					case 'activePlayer':
						this.events.emit('player-turn-changed', value)
						break

					case 'winningPlayer':
						this.events.emit('player-win', value, this.playerId, 0)
						break

					case 'gameState':
						this.events.emit('game-state-changed', value)
						break

					case 'isDraw':
						this.events.emit('game-draw', -1, value)
						break

				}
			})
		}

		this.room.state.board.onChange = (item, idx) => {
			this.events.emit('board-changed', item, idx)
		}

		this.room.onMessage(Message.PlayerDisconnected, async (message: {playerIndex: number}) => {
			const eventType = 'match_aborted';
			const postMessage = 'Match has aborted';
			const matchAbortData: MatchAbortData = {
			datetime: new Date().toISOString(),
    		event_type: eventType,
			error_code: 'match_aborted',
			error_description: 'match has aborted'
			}

		if(this.room?.state.gameState === GameState.Playing)
		{
			await this.sendMatchAbortRequest(this.token, eventType, postMessage, matchAbortData)
			this.events.emit('match-aborted')
		}

		});
	}

	leave()
	{
		this.room?.leave()
		this.events.removeAllListeners()
	}

	makeSelection(idx: number, isCurrentPlayerBot: boolean)
	{
		if (!this.room)
		{
			return
		}

		if (this.room.state.gameState !== GameState.Playing)
		{
			return
		}

		if(!this.isBot){
			if (this.playerIndex !== this.room.state.activePlayer)
			{
				console.warn('not this player\'s turn')
				return
			}
			this.room.send(Message.PlayerSelection, { index: idx, isBotTurn: isCurrentPlayerBot })
		} else {
			this.room.send(Message.PlayerSelection, { index: idx, isBotTurn: isCurrentPlayerBot })
		}

	}

	onceStateChanged(cb: (state: ITicTacToeState) => void, context?: any)
	{
		this.events.once('once-state-changed', cb, context)
	}

	onBoardChanged(cb: (cell: number, index: number) => void, context?: any)
	{
		this.events.on('board-changed', cb, context)
	}

	onPlayerTurnChanged(cb: (playerIndex: number) => void, context?: any)
	{
		this.events.on('player-turn-changed', cb, context)
	}

	onPlayerWon(cb: (playerIndex: number, playerId: string) => void, context?: any)
	{
		this.events.on('player-win', cb, context)
	}

	onGameStateChanged(cb: (state: GameState) => void, context?: any)
	{
		this.events.on('game-state-changed', cb, context)
	}

	onGameDraw(cb: (gameDraw: boolean) => void, context?: any)
	{
		this.events.on('game-draw', cb, context)
	}

	onMatchAborted(cb: () => void, context?: any)
	{
		this.events.on('match-aborted', cb, context)
	}

	async sendMatchAbortRequest(
		token: string,
		eventType: string,
		message: string,
		matchEndData: MatchAbortData
	) {
		const payload: PostRequestPayload = {
			token,
			event_type: eventType,
			message,
			data: matchEndData
		};

		try {
			const response = await fetch('http://localhost:3000/match_aborted', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
	
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
	
			const responseData = await response.json();
		} catch (error) {
			console.error('Error sending POST request:', error);
		}
	}
}

interface MatchAbortData {
	datetime: string;
    event_type: string;
	error_code: string;
	error_description: string;
}

interface PostRequestPayload {
    token: string;
    event_type: string;
    message: string;
    data: MatchAbortData;
}