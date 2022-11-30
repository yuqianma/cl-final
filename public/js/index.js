
const DEFAULTS = {
	SPEED: 1 * 0.1,
	ROTATION_SPEED: 2,
};

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

const point = {
	'type': 'FeatureCollection',
	'features': [
		{
			'type': 'Feature',
			'properties': {
				bearing: -30,
			},
			'geometry': {
				'type': 'Point',
				'coordinates': NANJING
			}
		}
	]
};

const locations = {
	'type': 'FeatureCollection',
	'features': [NANJING, MONTREAL, SHANGHAI].map((coordinates, i) => ({
		'type': 'Feature',
		'properties': {
			bearing: 90,
			color: i ? "#0bd" : "#fe3"
		},
		'geometry': {
			'type': 'Point',
			'coordinates': coordinates
		}
	}))
}

map.on('load', () => {
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

	let speed = DEFAULTS.SPEED;
	let rotationSpeed = DEFAULTS.ROTATION_SPEED;

	let playing = true;

	let bearing = 90; // 90 = north, counter-clockwise

	window.addEventListener('keydown', (e) => {
		console.log(e);
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

		const point = locations.features[0];
		point.properties.bearing = bearing;
	});

	function animate() {
		if (!playing) return;

		const point = locations.features[0];
		const radian = bearing * Math.PI / 180;
		const coordinates = point.geometry.coordinates;
		coordinates[0] = addLon(coordinates[0], speed * Math.cos(radian));
		coordinates[1] = addLat(coordinates[1], speed * Math.sin(radian));
		// console.log(point.geometry.coordinates);
		map.getSource('point').setData(locations);

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
