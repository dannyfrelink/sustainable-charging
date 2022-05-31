const socket = io();
const div = document.querySelector('#location');
const chargingStationsUl = document.querySelector('#charging_stations');
const loaderSection = document.querySelector('#loader');

const getLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        div.innerHTML = 'The Browser Does not Support Geolocation';
    }
}

const showPosition = position => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    socket.emit('location', { latitude, longitude })
    // div.innerHTML = 'Latitude: ' + latitude + '<br>Longitude: ' + longitude;
}

const showError = error => {
    if (error.PERMISSION_DENIED) {
        div.innerHTML = 'The User have denied the request for Geolocation.';
    }
}
getLocation();

socket.on('fill-in-data', data => {
    loaderSection.classList.add('hidden');
    // data.forEach(d => {
    //     let chargingStation = document.createElement('li');
    //     chargingStation.innerHTML = d.operatorName;
    //     chargingStationsUl.appendChild(chargingStation);

    // })
});

        // http://www.google.com/maps/place/52.5089142,4.7724513