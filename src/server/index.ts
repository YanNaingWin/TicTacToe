import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server, matchMaker } from 'colyseus'
import { monitor } from '@colyseus/monitor'
import TicTacToe from './TicTacToe'

const port = Number(process.env.PORT || 2567)
const app = express()

app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const gameServer = new Server({
	server,
})

// register your room handlers
app.post('/create-room/:matchId', async (req, res) => 
{
	const { matchId } = req.params
	const { isBot } = req.body

	try
	{
		const rooms = await matchMaker.query({name: matchId})
		if(rooms.length > 0)
		{
			const existingRoom = rooms[0]

            const roomInfo = await matchMaker.query({ roomId: existingRoom.roomId });
            if (roomInfo.length > 0 && roomInfo[0].clients >= 2) {

                return res.status(400).send(`Room with matchId: ${matchId} is full`);
            }
            return res.status(200).send({ roomId: existingRoom.roomId });
		}
		else
		{
			gameServer.define(`${matchId}`, TicTacToe, {isBot: isBot, isRoomFull: false})
			.enableRealtimeListing();

			const room = await matchMaker.createRoom(matchId, {isBot: isBot, isRoomFull: false})

			res.status(200).send({ roomId: room.roomId });

		}
	}
	catch (err)
	{
		res.status(500).send(`Error: ${(err as Error).message}`)
	}
})
// register colyseus monitor AFTER registering your room handlers
app.use('/colyseus', monitor())

gameServer.listen(port)
console.log(`Listening on ws://localhost:${port}`)