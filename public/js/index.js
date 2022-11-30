
const DEFAULTS = {
	SPEED: 1 * 0.1,
	ROTATION_SPEED: 2,
};

// test data
const NANJING = [118.7965, 32.0584];
const MONTREAL = [-73.5673, 45.5017];
const SHANGHAI = [121.4737, 31.2304];
const BERLIN = [13.4050, 52.5200];

mapboxgl.accessToken = 'pk.eyJ1IjoibWF5cTA0MjIiLCJhIjoiY2phamMwOHV4MjllajMzbnFyeTMwcmZvYiJ9.aFMw4Aws5zY9Y4NwYqFMlQ';
const map = new mapboxgl.Map({
	container: 'map',
	// Choose from Mapbox's core styles, or make your own style with Mapbox Studio
	style: 'mapbox://styles/mapbox/dark-v11',
	center: [0, 0],
	zoom: 1.8,
	// interactive: false,
	dragPan: false,
	dragRotate: false,
	projection: 'naturalEarth' // starting projection
});

// const locations = {
// 	'type': 'FeatureCollection',
// 	'features': [NANJING, MONTREAL, SHANGHAI].map((coordinates, i) => ({
// 		'type': 'Feature',
// 		'properties': {
// 			bearing: 90,
// 			color: i ? "#0bd" : "#fe3"
// 		},
// 		'geometry': {
// 			'type': 'Point',
// 			'coordinates': coordinates
// 		}
// 	}))
// };

const locations = {
	'type': 'FeatureCollection',
	'features': []
};

function addPlayer(player, isMe) {
	locations.features.push({
		'type': 'Feature',
		'properties': {
			bearing: 90,
			color: isMe ? "#fe3" : "#0bd",
			id: player.id
		},
		'geometry': {
			'type': 'Point',
			'coordinates': player.coordinates
		}
	});
}

const socket = io();
socket.on("connect", async () => {
	console.log("connected", socket.id);

	const response = await fetch('/api/online');
	const { data } = await response.json();
	data.forEach((player) => {
		addPlayer(player, false);
	});
});
socket.on('addPlayer', (data) => {
	addPlayer(data, false);
});
socket.on('removePlayer', (data) => {
	const { id } = data;
	const index = locations.features.findIndex((feature) => feature.properties.id === id);
	if (index >= 0) {
		locations.features.splice(index, 1);
	}
});
socket.on('updatePlayer', (data) => {
	const { id, coordinates } = data;
	const index = locations.features.findIndex((feature) => feature.properties.id === id);
	if (index >= 0) {
		locations.features[index].geometry.coordinates = coordinates;
	}
});

map.on('load', async () => {

	const destination = new mapboxgl.Marker()
		.setLngLat(BERLIN)
		.addTo(map);

	map.addSource('point', {
		'type': 'geojson',
		'data': locations
	});

	map.addLayer({
		'id': 'point',
		'source': 'point',
		'type': 'symbol',
			'layout': {
				'text-field': '✈', // reference the image
				'text-size': 50,
				'text-rotate': ['*', -1, ['get', 'bearing']],
				'text-rotation-alignment': 'map',
				'text-allow-overlap': true,
				'text-ignore-placement': true
		},
		"paint": {
			'text-color': ['coalesce', ['get', 'color'], '#0bd']
		}
	});

	// ----------------------------

	let speed = 0;
	let rotationSpeed = DEFAULTS.ROTATION_SPEED;
	let playing = true;
	let bearing = 90; // 90 = north, counter-clockwise

	// TODO
	// socket.on('start', () => {
	// 	//
	// });

	const lonLat = await getLonLat();
	const { id } = socket;
	addPlayer({ id, coordinates: lonLat }, true);
	socket.emit('addPlayer', { id, coordinates: lonLat });

	window.addEventListener('keydown', (e) => {
		// console.log(e);

		const point = locations.features.find((feature) => feature.properties.id === id);
		if (!point) {
			return;
		}
		const from = turf.point(point.geometry.coordinates);
		const to = turf.point(BERLIN);
		const distance = turf.distance(from, to, { units: 'kilometers' });
		// console.log(distance);
		if (distance < 400) {
			speed = 0;
			return;
		}

		if (e.key === '0') { // for debug
			playing = !playing;
			if (playing) {
				animate();
			}
		} else if (e.key === ' ') {
			speed = speed === DEFAULTS.SPEED ? 0 : DEFAULTS.SPEED;
		} else if (e.key === 'a') {
			bearing += rotationSpeed;
		} else if (e.key === 'd') {
			bearing -= rotationSpeed;
		} else {
			return;
		}	
		point.properties.bearing = bearing;
	});

	function animate() {
		if (!playing) return;

		const point = locations.features.find((feature) => feature.properties.id === id);
		const radian = bearing * Math.PI / 180;
		const coordinates = point.geometry.coordinates;
		coordinates[0] = addLon(coordinates[0], speed * Math.cos(radian));
		coordinates[1] = addLat(coordinates[1], speed * Math.sin(radian));
		// console.log(point.geometry.coordinates);
		map.getSource('point').setData(locations);

		if (speed > 0) {
			socket.emit('updatePlayer', { id, coordinates });
		}

		requestAnimationFrame(animate);
	}

	animate();
		
});

function addLon(lon, delta) {
	lon += delta;
	if (lon > 180) {
		lon = -180;
	} else if (lon < -180) {
		lon = 180;
	}
	return lon;
}

function addLat(lat, delta) {
	lat += delta;
	if (lat > 90) {
		lat = -90;
	} else if (lat < -90) {
		lat = 90;
	}
	return lat;
}

function clamp(v, min, max) {
	return Math.min(Math.max(v, min), max);
}

async function getLonLat() {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition((position) => {
			resolve([position.coords.longitude, position.coords.latitude]);
		}, (err) => {
			reject(err);
		});
	});
}
