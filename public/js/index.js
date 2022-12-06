import { DEFAULTS } from "./constants.js";
import { store } from "./store.js";
import { start } from "./map.js";

async function getLocationByIP() {
	try {
		const res = await fetch('https://ipapi.co/json');
		const data = await res.json();
		console.log(data);
		return {
			placeName: data.city,
			coordinates: [data.longitude, data.latitude],
		};
	} catch (error) {
		console.log(error);
	}
}

async function initBoarding() {
	const boardingView = document.getElementById('boarding');
	const inputPlayerName = document.getElementById('input-player-name');
	const inputAirplaneColor = document.getElementById('input-airplane-color');
	const airplaneIcon = document.getElementById('airplane-icon');

	const startButton = document.getElementById('button-start');

	// dialog state
	const state = {
		playerName: null,
		placeName: null,
		coordinates: [],
		get airplaneColor() {
			return inputAirplaneColor.value;
		},
		set airplaneColor(value) {
			inputAirplaneColor.value = value;
			airplaneIcon.style.color = value;
		}
	};

	// state.airplaneColor = DEFAULTS.AIRPLANE_COLOR;
	state.airplaneColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

	const checkStartButton = () => {
		if (state.playerName && state.placeName && state.coordinates?.length === 2 && store.getState().id) {
			startButton.disabled = false;
		} else {
			startButton.disabled = true;
		}
	};

	store.getSocket().on('connect', () => {
		startButton.innerText = 'Start';
		checkStartButton();
	});

	const setLocation = (placeName, coordinates) => {
		console.log(placeName, coordinates);
		state.placeName = placeName;
		state.coordinates = coordinates;
		checkStartButton();
	};

	// init player name input
	inputPlayerName.addEventListener('input', (event) => {
		state.playerName = event.target.value;
		checkStartButton();
	});

	// init search box for location
	const geocoder = new MapboxGeocoder({
		accessToken: mapboxgl.accessToken,
		types: 'place',
		placeholder: 'Search for your city',
	});
	geocoder.addTo('#geocoder');
	geocoder.on('result', (data) => {
		console.log(data);
		if (data.result) {
			const { text, center } = data.result;
			setLocation(text, center);
		}
	});
	geocoder.on('clear', () => {
		console.log('clear');
		setLocation();
	});

	inputAirplaneColor.addEventListener('input', (event) => {
		state.airplaneColor = event.target.value;
	});

	// start!
	startButton.addEventListener('click', () => {
		start({
			id: store.getState().id,
			name: state.playerName,
			color: state.airplaneColor,
			coordinates: state.coordinates,
			bearing: DEFAULTS.BEARING,
		});
		boardingView.classList.remove('active');
	});

	// set default location
	const location = await getLocationByIP();
	if (location) {
		setLocation(location.placeName, location.coordinates);
		geocoder._inputEl.value = location.placeName;
	}
}

initBoarding();
