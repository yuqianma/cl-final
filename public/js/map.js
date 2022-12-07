import { DEFAULTS, LOCATIONS } from "./constants.js";
import { store } from "./store.js";

const BERLIN = LOCATIONS.BERLIN;

function initMap() {
	const map = new mapboxgl.Map({
		container: 'map',
		// Choose from Mapbox's core styles, or make your own style with Mapbox Studio
		style: 'mapbox://styles/mapbox/dark-v11',
		center: [0, 0],
		zoom: 1.8,
		attributionControl: false,
		interactive: false,
		// dragPan: false,
		// dragRotate: false,
		// keyboard: false,
		projection: 'naturalEarth' // starting projection
		// projection: 'mercator'
	});

	map.on('load', () => {
		onMapLoad(map);
	});

	window._map = map;
}

const audioCongrats = new Audio('./assets/欢呼喝彩音效.mp3');

function onMapLoad(map) {

	let popup = null;
	function showPopup() {
		if (popup) return;
		popup = new mapboxgl.Popup({
			anchor: 'top',
			className: 'popup',
			maxWidth: 'none',
			closeOnClick: false,
			focusAfterOpen: false,
		})
		.setLngLat(BERLIN)
		.setHTML('<img src="./assets/congrats4.gif"/>')
		.addTo(map);

		audioCongrats.currentTime = 0;
		audioCongrats.play();
	}
	function hidePopup() {
		if (popup) {
			popup.remove();
			popup = null;
		}

		audioCongrats.pause();
	}

	// showPopup();

	const destination = {
		'type': 'Feature',
		'properties': {
			'arrived': false,
		},
		'geometry': {
			'type': 'Point',
			'coordinates': BERLIN
		}
	};

	map.addSource('destination', {
		'type': 'geojson',
		'data': destination
	});

	map.addLayer({
			"id": "point-glow",
			"type": "circle",
			"source": "destination",
			"paint": {
					"circle-radius": 20,
					"circle-color": "#99ffcc",
					"circle-opacity": 0.4
			}
	});

	map.addLayer({
		"id": "point-glow-strong",
		"type": "circle",
		"source": "destination",
		"paint": {
				"circle-radius": 10,
				// "circle-color": "#00e673",
				// "circle-color": "#ffee33",
				"circle-color": [
					'case',
					['get', 'arrived'],
					'#ffee33',
					'#00e673'
				],
				"circle-opacity": .8
		}
});

	map.addLayer({
		'id': 'label',
		'source': 'destination',
		'type': 'symbol',
		'layout': {
			'text-field': 'Berlin',
			'text-size': 35,
			'text-offset': [0, -1.1],
			'text-allow-overlap': true,
			'text-ignore-placement': true
		},
		"paint": {
			'text-color': "#0b9" 
		}
	});

	map.addSource('players', {
		'type': 'geojson',
		'data': store.getState().players
	});

	map.addSource('trails', {
		'type': 'geojson',
		'data': store.getState().trails
	});

	map.addLayer({
		'id': 'players',
		'source': 'players',
		'type': 'symbol',
		'layout': {
			'text-field': '✈',
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

	map.addLayer({
		'id': 'trails',
		'source': 'trails',
		'type': 'line',
		'layout': {
			'line-join': 'round',
			'line-cap': 'round'
		},
		'paint': {
			'line-color': ['get', 'color'],
			'line-opacity': 0.5,
			'line-width': 2
		}
	});

	function animate() {
		const state = store.getState();
		// console.log(state);
		map.getSource('players').setData(state.players);
		map.getSource('trails').setData(state.trails);

		destination.properties.arrived = store.haveIArrived();
		map.getSource('destination').setData(destination);

		if (store.haveAllArrived()) {
			showPopup();
		} else {
			hidePopup();
		}

		requestAnimationFrame(animate);
	}

	animate();
}

initMap();

export function start(player) {
	store.addMe(player);

	const id = store.getState().id;
	const myPoint = store.getState().players.features.find((feature) => feature.properties.id === id);

	let speed = 0;
	let rotationSpeed = DEFAULTS.ROTATION_SPEED;
	let bearing = 90; // 90 = north, counter-clockwise

	window.addEventListener('keydown', (e) => {
		// console.log(e);
		// const from = turf.point(myPoint.geometry.coordinates);
		// const to = turf.point(BERLIN);
		// const distance = turf.distance(from, to, { units: 'kilometers' });
		// // console.log(distance);
		// if (distance < 400) {
		// 	speed = 0;
		// 	return;
		// }

		if (e.key === ' ') {
			speed = speed === DEFAULTS.SPEED ? 0 : DEFAULTS.SPEED;
		} else if (e.key === 'a' || e.key === 'ArrowLeft') {
			bearing += rotationSpeed;
		} else if (e.key === 'd' || e.key === 'ArrowRight') {
			bearing -= rotationSpeed;
		} else {
			return;
		}		
	});

	function animate() {
		myPoint.properties.bearing = bearing;
		const radian = bearing * Math.PI / 180;
		const prevCoordinates = myPoint.geometry.coordinates;
		const nextCoordinates = [];
		nextCoordinates[0] = addLon(prevCoordinates[0], speed * Math.cos(radian));
		nextCoordinates[1] = addLat(prevCoordinates[1], speed * Math.sin(radian));

		if (speed > 0) {
			store.updateMyLocation({ coordinates: nextCoordinates, bearing });
		}

		requestAnimationFrame(animate);
	}

	animate();
}

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
