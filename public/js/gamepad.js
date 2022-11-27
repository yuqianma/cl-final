// https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation
// https://kongmunist.medium.com/accessing-the-iphone-accelerometer-with-javascript-in-ios-14-and-13-e146d18bb175
const ball = document.querySelector(".ball");
const garden = document.querySelector(".garden");
const output = document.querySelector(".output");

const maxX = garden.clientWidth - ball.clientWidth;
const maxY = garden.clientHeight - ball.clientHeight;

function handleOrientation(event) {
  let x = event.beta; // In degree in the range [-180,180)
  let y = event.gamma; // In degree in the range [-90,90)
	let z = event.alpha;

  output.textContent = `beta : ${x}\n`;
  output.textContent += `gamma: ${y}\n`;
	output.textContent += `alpha: ${z}\n`;

  // Because we don't want to have the device upside down
  // We constrain the x value to the range [-90,90]
  if (x > 90) {
    x = 90;
  }
  if (x < -90) {
    x = -90;
  }

  // To make computation easier we shift the range of
  // x and y to [0,180]
  x += 90;
  y += 90;

  // 10 is half the size of the ball
  // It center the positioning point to the center of the ball
  // ball.style.top = `${(maxY * y) / 180 - 10}px`;
  // ball.style.left = `${(maxX * x) / 180 - 10}px`;
  ball.style.left = `${(maxY * y) / 180 - 10}px`;
  ball.style.top = `${(maxX * x) / 180 - 10}px`;
}

if (DeviceOrientationEvent.requestPermission) {
	document.querySelector('button').addEventListener('click', async () => {
		const response = await DeviceOrientationEvent.requestPermission();
		if (response == 'granted') {
			window.addEventListener("deviceorientation", handleOrientation);
		}
	});
} else {
	window.addEventListener("deviceorientation", handleOrientation);
}
