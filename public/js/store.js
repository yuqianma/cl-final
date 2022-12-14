import { LOCATIONS } from "./constants.js";

const fetchOnlinePlayers = () => fetch('/api/online').then((response) => response.json());

const initState = {
	id: null,
	players: {
		'type': 'FeatureCollection',
		'features': []
	},
	trails: {
		'type': 'FeatureCollection',
		'features': []
	}
};

const playerList = document.getElementById('player-list');

function appendPlayerName(id, name, color) {
	const playerItem = document.createElement('div');
	playerItem.id = `player-${id}`;
	playerItem.innerHTML = `<span class="player-list-icon" style="color:${color};">⬤</span>${name}`;
	playerList.appendChild(playerItem);
}

function removePlayerName(id) {
	document.getElementById(`player-${id}`)?.remove();
}

function createStore(state = initState) {

	// sync player including trail
	function syncPlayer({ id, name, color, bearing, coordinateList }) {
		state.players.features.push({
			'type': 'Feature',
			'properties': {
				id,
				name,
				color,
				bearing,
			},
			'geometry': {
				'type': 'Point',
				'coordinates': coordinateList.at(-1)
			}
		});
		state.trails.features.push({
			'type': 'Feature',
			'properties': {
				id,
				name,
				color,
			},
			'geometry': {
				'type': 'LineString',
				'coordinates': coordinateList
			}
		});
		appendPlayerName(id, name, color);
	}

	function addPlayer({ id, name, color, bearing, coordinates }) {
		syncPlayer({ id, name, color, bearing, coordinateList: [coordinates] });
	}

	function removePlayer(id) {
		const index = state.players.features.findIndex((feature) => feature.properties.id === id);
		if (index >= 0) {
			state.players.features.splice(index, 1);
			state.trails.features.splice(index, 1);
			removePlayerName(id);
		}
	}

	function updatePlayer({ id, coordinates, bearing }) {
		const index = state.players.features.findIndex((feature) => feature.properties.id === id);
		if (index >= 0) {
			state.players.features[index].properties.bearing = bearing;
			state.players.features[index].geometry.coordinates = coordinates;
			state.trails.features[index].geometry.coordinates.push(coordinates);
		}
	}

	const to = turf.point(LOCATIONS.BERLIN);
	const distanceDelta = 600;

	function haveIArrived() {
		const feature = state.players.features.find((feature) => feature.properties.id === state.id);
		if (!feature) {
			return false;
		}
		const from = feature.geometry.coordinates;
		const distance = turf.distance(from, to, { units: 'kilometers' });
		return distance < distanceDelta;
	}

	// more than two players and everyone has arrived in Berlin
	function haveAllArrived() {
		// if (state.players.features.length === 0) {
		// 	return false;
		// }
		if (state.players.features.length < 2) {
			return false;
		}
		const result = state.players.features.every((feature) => {
			const from = feature.geometry.coordinates;
			const distance = turf.distance(from, to, { units: 'kilometers' });
			return distance < distanceDelta;
		});
		// console.log('haveAllArrived', result);
		return result;
	}

	const socket = io();
	socket.on("connect", async () => {
		console.log("connected", socket.id);
		state.id = socket.id;

		const { data } = await fetchOnlinePlayers();
		console.log('online players', data)
		data.forEach((player) => {
			syncPlayer(player);
		});
	});
	socket.on('addPlayer', (data) => {
		console.log('addPlayer', data);
		addPlayer(data);
	});
	socket.on('removePlayer', (data) => {
		console.log('removePlayer', data);
		removePlayer(data.id);
	});
	socket.on('updatePlayer', (data) => {
		updatePlayer(data);
	});

	function addMe(player) {
		player = { ...player, id: state.id };
		addPlayer(player);
		socket.emit('addPlayer', player);
	}

	function updateMyLocation({ coordinates, bearing }) {
		const id = state.id;
		updatePlayer({ id, coordinates, bearing });
		socket.emit('updatePlayer', { id, coordinates, bearing });
	}

	return {
		getState: () => state,
		getSocket: () => socket,
		addMe,
		updateMyLocation,
		haveIArrived,
		haveAllArrived,
	};	
}

export const store = createStore();

// debug
window._store = store;
