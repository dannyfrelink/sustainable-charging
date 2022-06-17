const socket = io();
const results = document.querySelector('#results');
const openTimes = document.querySelector('#open_times');
const openFilters = document.querySelector('#open_filters');
const filters = document.querySelector('#filters');
const times = document.querySelector('#times');
const rangeInput = document.querySelector('input[type="range"]');
const numberInput = document.querySelector('input[type="number"]');
numberInput.disabled = true;
const sortInputs = document.querySelectorAll('input[type="radio"]');
const errorMessage = document.querySelector('#error_message');
const chargingStations = document.querySelector('#charging_stations');
const loaderSection = document.querySelector('#loader');

const getLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        errorMessage.classList.remove('hidden');
        errorMessage.textContent = 'Your browser does not let you share your location. Maybe try in another browser.';
    }
}

const showPosition = position => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    socket.emit('location', { latitude, longitude });
}

const showError = error => {
    if (error.PERMISSION_DENIED) {
        errorMessage.classList.remove('hidden');
        errorMessage.textContent = "It seems that we don't have access to your location. Check your settings to enable us to track your location.";
    }
}
getLocation();

openFilters.addEventListener('click', () => {
    openFilters.classList.toggle('active');
    filters.classList.toggle('hidden');

    if (openFilters.classList.contains('active')) {
        openTimes.classList.remove('active');
        times.classList.add('hidden');
    }
});

openTimes.addEventListener('click', () => {
    openTimes.classList.toggle('active');
    times.classList.toggle('hidden');

    if (openTimes.classList.contains('active')) {
        openFilters.classList.remove('active');
        filters.classList.add('hidden');
    }
});

function changeStylingRangeInput(e) {
    let target = e.target;
    numberInput.value = target.value;

    const min = target.min;
    const max = target.max;
    const val = target.value;

    target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%';
}

rangeInput.addEventListener('input', (e) => {
    chargingStations.textContent = '';
    let target = e.target;
    numberInput.value = target.value;

    const min = target.min;
    const max = target.max;
    const val = target.value;

    target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%';
});

sortInputs.forEach(input => {
    input.addEventListener('change', () => {
        chargingStations.textContent = '';
    });
});

let resultsAmount = 0;
socket.on('fill-in-data', (stationsBySupplier, stationsByDistance) => {
    chargingStations.classList.remove('hidden');
    loaderSection.classList.add('hidden');

    sortInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const checkedInput = e.target.id;
            if (checkedInput == 'sustainability') {
                fillInChargingStationsBySupplier(stationsBySupplier);
            } else if (checkedInput == 'distance') {
                fillInChargingStationsByDistance(stationsByDistance, stationsBySupplier);
            }
        });
    });

    rangeInput.addEventListener('input', () => {
        if (sortInputs[0].checked) {
            fillInChargingStationsBySupplier(stationsBySupplier);
        } else if (sortInputs[1].checked) {
            fillInChargingStationsByDistance(stationsByDistance, stationsBySupplier);
        }
        results.textContent = `${resultsAmount} results`;
    });

    fillInChargingStationsBySupplier(stationsBySupplier);
    results.textContent = `${resultsAmount} results`;
});

const fillInChargingStationsByDistance = (stations, value) => {
    resultsAmount = 0;
    const baseValue = Object.values(value[0])[0].value;

    stations.map(station => {
        Object.values(station).map(stat => {
            let sustainabilityScore = document.createElement('p');
            let sustainabilityValue = stat.value;
            sustainabilityScore.textContent = `Sustainability score: ${Math.round(baseValue / sustainabilityValue * 100)}%`;

            insertContent(stat.stations, sustainabilityScore);
        });
    });
}

const fillInChargingStationsBySupplier = stations => {
    resultsAmount = 0;
    const baseValue = Object.values(stations[0])[0].value;

    return stations.map(station => {
        return Object.keys(station).map(operator => {
            return station[operator].stations.map(stat => {
                let sustainabilityScore = document.createElement('p');
                let sustainabilityValue = station[operator].value;
                sustainabilityScore.textContent = `Sustainability score: ${Math.round(baseValue / sustainabilityValue * 100)}%`;

                insertContent(stat, sustainabilityScore);
            });
        });
    });
}

const insertContent = (station, sustainabilityScore) => {
    if (station.distance < rangeInput.value) {
        resultsAmount++;
        let latitude = station.coordinates.latitude;
        let longitude = station.coordinates.longitude;

        // Create all elements
        let chargingStation = document.createElement('article');
        let address = document.createElement('h2');
        let distance = document.createElement('p');
        let button = document.createElement('button');
        let extraInfoContainer = document.createElement('div');
        let operatorName = document.createElement('p');
        let providerName = document.createElement('p');
        let availability = document.createElement('p');
        let maxPower = document.createElement('p');
        let startRoute = document.createElement('a');
        let streetName = station.address.map(address => {
            if (address.id.includes('address')) {
                return address.text;
            }
        }).filter(e => e);

        // Create content of each charging station
        address.textContent = streetName[0];
        distance.textContent = `${station.distance} meters`;
        button.textContent = 'i';

        // Extra information (displays on click article)
        extraInfoContainer.setAttribute('id', 'extra_info_container');
        extraInfoContainer.classList.add('hidden');
        operatorName.textContent = `Operator: ${station.operatorName}`;
        providerName.textContent = `Provider: ${station.provider}`;
        availability.textContent = `Current status: ${station.status}`
        maxPower.textContent = `Maximum charging power: ${station.maxPower}kW`
        startRoute.setAttribute('href', `http://www.google.com/maps/place/${latitude},${longitude}`);
        startRoute.setAttribute('target', '_blank');
        startRoute.textContent = 'Start route';

        // Open and close extra info of article
        chargingStation.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() !== 'a') {
                extraInfoContainer.classList.toggle('hidden');
            }
        });

        // Append children
        if (streetName.length > 0) {
            extraInfoContainer.append(operatorName, providerName, sustainabilityScore, availability, maxPower, startRoute);
            chargingStation.append(address, distance, button, extraInfoContainer);
            chargingStations.appendChild(chargingStation);
        }
        return chargingStations;
    }
}