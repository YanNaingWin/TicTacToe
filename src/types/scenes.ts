import type Server from '../client/services/Server'

export interface IGameOverSceneData
{
	winner: boolean
	winnerId: string
	draw: boolean
}

export interface IGameSceneData
{
	server: Server
	onGameOver: (data: IGameOverSceneData) => void
}
