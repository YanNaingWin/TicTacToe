import Phaser from 'phaser'
import { IGameOverSceneData, IGameSceneData } from '../../types/scenes'
import ITicTacToeState, { Cell, GameState } from '../../types/ITicTacToeState'
import type Server from '../services/Server'

export default class Game extends Phaser.Scene
{
	
	private server?: Server
	private onGameOver?: (data: IGameOverSceneData) => void

	private gameStateText?: Phaser.GameObjects.Text
	private playerTurnBackground?: Phaser.GameObjects.Graphics
	private playerTurnText? : Phaser.GameObjects.Text

	private cells: { display: Phaser.GameObjects.Rectangle, value: Cell }[] = []

	private token: string = ""
	private matchId: string = ""
	private player1Id: string = ""
	private player2Id: string = ""
	private _player1Score = 0
	private _player2Score = 0
	private isBot: boolean = false
	private isBotDifficult: boolean = false
	private botPlayerIndex: number = 1
	private botSymbol = Cell.O
    private playerSymbol = Cell.X
	private size: number = 128

	constructor()
	{
		super('game')
	}

	init()
	{
		this.cells = []
	}

	preload()
	{
		this.load.image('board', 'assets/images/board.png')
		this.load.image('x', 'assets/images/X.png')
		this.load.image('o', 'assets/images/O.png')
		this.load.image('player1Icon', 'assets/images/Player1Icon.png')
		this.load.image('player2Icon', 'assets/images/Player2Icon.png')

		this.load.audio('click', 'assets/audio/click.wav')
	}

	async create(data: IGameSceneData)
	{
		const { server, onGameOver } = data

		const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.add.image(centerX, centerY, 'board').setScale(0.5)

		this.server = server
		this.onGameOver = onGameOver

		if (!this.server)
		{
			throw new Error('server instance missing')
		}

		this.getDataFromURL()

		await this.server.createRoom(this.matchId, this.isBot, this.token)

		await this.server.join(this.matchId, this.player1Id, this.player2Id)

		this.server.onceStateChanged(this.createBoard, this)
	}

	private createBoard(state: ITicTacToeState)
	{
		const { width, height } = this.scale
		let x = (width * 0.5) - 140
		let y = (height * 0.5) - 140
		state.board.forEach((cellState, idx) => {
			const cell = this.add.rectangle(x, y, this.size, this.size)
				.setInteractive()
				.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
					this.sound.add('click').play()
					this.server?.makeSelection(idx, false)
				})

			switch (cellState)
			{
				case Cell.X:
				{
					this.add.image(cell.x, cell.y, 'x')
                    .setOrigin(0.5)
                    .setScale(this.size / 128); // Adjust scale as needed
                	break
				}

				case Cell.O:
				{
					this.add.image(cell.x, cell.y, 'o')
                    .setOrigin(0.5)
                    .setScale(this.size / 128); // Adjust scale as needed
                	break
				}
			}

			this.cells.push({
				display: cell,
				value: cellState 
			})

			if (cellState !== Cell.Empty) {
				cell.disableInteractive();
			}

			x += this.size + 10
 
			if ((idx + 1) % 3 === 0)
			{
				y += this.size + 10
				x = (width * 0.5) - 140
			}
		})

		this.playerTurnBackground = this.add.graphics()

        this.playerTurnBackground.fillStyle(0xffffff, 1)

		this.playerTurnBackground?.fillRoundedRect(width * 0.01, 20, 300, 100, 32).setPosition(width * 0.002, 0)

		if (this.server?.gameState === GameState.WaitingForPlayers)
		{

			this.playerTurnBackground?.setAlpha(0)

			this.gameStateText = this.add.text(width * 0.5, 50, 'Waiting for opponent...')
				.setOrigin(0.5)
				.setColor('#636b77')
		} 
		else 
		{

			this.playerTurnText = this.add.text(width * 0.07, 100, 'This player\'s turn')
				.setOrigin(0, 0.5)
				.setColor('#636b77')

			this.add.image(width * 0.07, 60, 'player1Icon')
				.setScale(0.1)

			this.add.image(width * 0.93, 60, 'player2Icon')
				.setScale(0.1)

			this.add.text(width * 0.15, 60, this.player1Id)
				.setOrigin(0, 0.5)
				.setColor('#636b77')

			this.add.text(width * 0.85, 60, this.player2Id)
				.setOrigin(1, 0.5)
				.setColor('#636b77')

		}

		this.server?.onBoardChanged(this.handleBoardChanged, this)
		this.server?.onPlayerTurnChanged(this.handlePlayerTurnChanged, this)
		this.server?.onPlayerWon(this.handlePlayerWon, this)
		this.server?.onGameStateChanged(this.handleGameStateChanged, this)
		this.server?.onGameDraw(this.handleGameDraw, this)
		this.server?.onMatchAborted(this.matchAborted, this)
	}
 
	private handleBoardChanged(newValue: Cell, idx: number)
	{
		const cell = this.cells[idx]
		if (cell.value !== newValue)
		{
			switch (newValue)
			{
				case Cell.X:
				{
					this.add.image(cell.display.x, cell.display.y, 'x')
                    .setOrigin(0.5)
                    .setScale(0.5); // Adjust scale as needed
                	break
				}

				case Cell.O:
				{
					this.add.image(cell.display.x, cell.display.y, 'o')
                    .setOrigin(0.5)
                    .setScale(0.5); // Adjust scale as needed
                	break
				}
			}

			cell.value = newValue


			if (newValue !== Cell.Empty) {
				cell.display.disableInteractive();
			}
		}
	}

	private handlePlayerTurnChanged(playerIndex: number)
	{

		const width = this.scale.width

		if(playerIndex === 0)
		{
			this.playerTurnBackground?.setPosition(width * 0.002, 0)
			this.playerTurnText?.setPosition(width * 0.07, 100).setOrigin(0, 0.5)
		}
		else
		{
			this.playerTurnBackground?.setPosition(width * 0.48, 0)
			this.playerTurnText?.setPosition(width * 0.93, 100).setOrigin(1, 0.5)
		}

		if (playerIndex === this.botPlayerIndex && this.isBot) 
		{
			setTimeout(() => 
			{
				this.sound.add('click').play()
				if (!this.isBotDifficult)
				{
					const randomValue = Math.random()
					if (randomValue < 0.6) {
						// Make a deterministic strategic move
						this.botMove();
					} else {
						// Make a weighted random move
						const move = this.getWeightedMove()
						if (move !== -1) {
							this.server?.makeSelection(move, true)
						} else {
							console.log('No available moves to make.')
						}
					}
				}
				else
				{
					this.botMove()
				}
        	}, 1000);
		}
	}

	private botMove() {
        let move : number | null = null;

        // Implementing the strategic moves for the bot player

        // 1. Win: Check if the bot can win
        move = this.findWinningMove(this.botSymbol);
        if (move !== null) {
            this.server?.makeSelection(move, true);
            return;
        }

        // 2. Block: Check if the player can win, and block them
        move = this.findWinningMove(this.playerSymbol);
        if (move !== null) {
            this.server?.makeSelection(move, true);
            return;
        }

        // 3. Take the center
        if (this.isCellEmpty(4)) {
            this.server?.makeSelection(4, true);
            return;
        }

        // 4. Choose a random empty cell as the last resort
        move = this.findRandomMove();
        if (move !== null) {
            this.server?.makeSelection(move, true);
        }
    }

    // Utility functions for bot logic
    private isCellEmpty(idx: number): boolean {

        return this.cells[idx].value === Cell.Empty;
    }

    private findWinningMove(symbol: Cell): number | null {
        for (let i = 0; i < 9; i++) {
            if (this.isCellEmpty(i)) {
                this.cells[i].value = symbol;
                if (this.checkWin(symbol)) {
                    this.cells[i].value = Cell.Empty; // Undo the move
                    return i;
                }
                this.cells[i].value = Cell.Empty; // Undo the move
            }
        }
        return null;
    }

    private checkWin(symbol: Cell): boolean {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        return winPatterns.some(pattern =>
            pattern.every(idx => this.cells[idx].value === symbol)
        );
    }

    private findRandomMove(): number | null {
        const emptyCells = this.cells
            .map((cell, index) => cell.value === Cell.Empty ? index : null)
            .filter(index => index !== null);

        if (emptyCells.length > 0) {
            const randomIndex = Phaser.Math.RND.pick(emptyCells);
            return randomIndex as number;
        }

        return null;
    }

	private toIndex(x: number, y: number): number {
		return x + y * 3;
	}
	
	// Updated getWeightedMove function
	private getWeightedMove(): number {
		const center = { x: 1, y: 1 };
		const corners = [
			{ x: 0, y: 0 },
			{ x: 0, y: 2 },
			{ x: 2, y: 0 },
			{ x: 2, y: 2 }
		];
	
		// Check for high-priority moves
		if (this.isCellEmpty(this.toIndex(center.x, center.y))) {
			return this.toIndex(center.x, center.y);
		}
	
		for (const corner of corners) {
			if (this.isCellEmpty(this.toIndex(corner.x, corner.y))) {
				return this.toIndex(corner.x, corner.y);
			}
		}
	
		// Random move if no high-priority move
		const availableMoves = this.getAvailableMoves();
		return Phaser.Math.RND.pick(availableMoves) ?? -1; // Ensure to return -1 if no available move
	}

	private getAvailableMoves(): number[] {
		return this.cells
			.map((cell, index) => cell.value === Cell.Empty ? index : null)
			.filter(index => index !== null) as number[];
	}

	async handlePlayerWon(playerIndex: number, playerId: string)
	{
		this.server?.setGameStateFinished()
		this.time.delayedCall(1000, () => {
			if (!this.onGameOver)
			{
				return
			}

			this.onGameOver({
				winner: this.server?.playerIndex === playerIndex,
				winnerId: playerId,
				draw: false
			})
		})

		if(playerIndex === 0){
			this._player1Score = 1
		}
		else
		{
			this._player2Score = 1
		}

		if (this.server?.playerIndex === 0){

			const token = this.token;
			const eventType = "match_ended";
			const message = 'Match has ended';

			const matchEndData: MatchEndData = {
    		event_type: eventType,
    		datetime: new Date().toISOString(),
    		winner: playerId,
    		player1Score: this._player1Score,
    		player2Score: this._player2Score,
		};

		await this.sendMatchEndRequest(token, eventType, message, matchEndData);

		}
	}

	private handleGameStateChanged(state: GameState)
	{
		if (state === GameState.Playing && this.gameStateText)
		{
			const width = this.scale.width
			this.gameStateText.destroy()
			this.gameStateText = undefined

			this.playerTurnBackground?.setAlpha(1)

			this.playerTurnText = this.add.text(width * 0.07, 100, 'This player\'s turn')
				.setOrigin(0, 0.5)
				.setColor('#636b77')

			this.add.image(width * 0.07, 60, 'player1Icon')
				.setScale(0.1)

			this.add.image(width * 0.93, 60, 'player2Icon')
				.setScale(0.1)

			this.add.text(width * 0.15, 60, this.player1Id)
				.setOrigin(0, 0.5)
				.setColor('#636b77')

			this.add.text(width * 0.85, 60, this.player2Id)
				.setOrigin(1, 0.5)
				.setColor('#636b77')

		}
	}

	async handleGameDraw(gameDraw : boolean)
	{

		this.server?.setGameStateFinished()
		this.time.delayedCall(1000, () => {
			if (!this.onGameOver)
			{
				return
			}

			this.onGameOver({
				winner: false,
				winnerId: "",
				draw: gameDraw
			})
		})

		if (this.server?.playerIndex === 0){

			const token = this.token;
			const eventType = 'match_ended';
			const message = 'Match has ended';

			const matchEndData: MatchEndData = {
    		event_type: eventType,
    		datetime: new Date().toISOString(),
    		winner: 'There is no winner',
    		player1Score: this._player1Score,
    		player2Score: this._player2Score,
		};

		await this.sendMatchEndRequest(token, eventType, message, matchEndData);

		}
	}

	private getDataFromURL()
	{
		const params: URLSearchParams = new URLSearchParams(window.location.search)

		this.token = params.get('token') || ''
		this.matchId = params.get('matchId') || ''
		this.player1Id = params.get('player1Id') || ''
		this.player2Id = params.get('player2Id') || ''

		if (this.player2Id.startsWith('a99') || this.player2Id.startsWith('b99')) {
			const randomValue = Math.random()
			if(randomValue <= 0.6)
			{
				this.isBotDifficult = true
			}
			else
			{
				this.isBotDifficult = false
			}
			this.isBot = true
		}

	}

	async sendMatchEndRequest(
		token: string,
		eventType: string,
		message: string,
		matchEndData: MatchEndData
	) {
		const payload: PostRequestPayload = {
			token,
			event_type: eventType,
			message,
			data: matchEndData
		};

		try {
			const response = await fetch('http://localhost:3000/match_ended', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
	
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

		} catch (error) {
			console.error('Error sending POST request:', error);
		}
	}

	async matchAborted(){
		const token = this.token;
		const eventType = "match_ended";
		const message = 'Match has ended';

		const handleMatchEnd = async () => {
			if (!this.onGameOver) {
				return;
			}
	
			if(this.server?.playerId)
			{
				this.onGameOver({
					winner: true,
					winnerId: this.server?.playerId,
					draw: false
				});

				const matchEndData: MatchEndData = {
					event_type: eventType,
					datetime: new Date().toISOString(),
					winner: this.server?.playerId,
					player1Score: this._player1Score,
					player2Score: this._player2Score,
				};

				await this.sendMatchEndRequest(token, eventType, message, matchEndData);
			}
			else
			{
				console.error('Server playerId is undefined. Ensure server initialization is completed.')
			}
		};

		this.time.delayedCall(1000, () => {
        if (this.server?.playerId) {
            handleMatchEnd()
        }
    });

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
