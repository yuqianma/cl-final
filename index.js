const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = 3000;

app.use(express.json());
app.use(express.static("public"));

// id, name, color, bearing, coordinateList
const players = [];

app.get('/api/online', (req, res) => {
	res.json({ data: players });
});

io.on('connection', (socket) => {
  console.log('a user connected');
	// console.log(socket);
	const { id } = socket;
	socket.on('addPlayer', (data) => {
		console.log('addPlayer', data);
		players.push({ ...data, coordinateList: [data.coordinates] });
		socket.broadcast.emit('addPlayer', data);
	});
	socket.on('updatePlayer', (data) => {
		console.log('updatePlayer', data);
		const player = players.find((player) => player.id === id);
		if (player) {
			player.coordinateList.push(data.coordinates);
		}
		socket.broadcast.emit('updatePlayer', data);
	});
	socket.on('disconnect', () => {
		const index = players.findIndex((player) => player.id === id);
		if (index >= 0) {
			players.splice(index, 1);
		}
		socket.broadcast.emit('removePlayer', { id });
    console.log('user disconnected');
  });
});

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
