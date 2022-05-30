const express = require('express');
const app = express();
const PORT = process.env.PORT || 5151;
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const fetch = require('node-fetch')

const InfluxDatabase = require('@influxdata/influxdb-client');
const InfluxDB = InfluxDatabase.InfluxDB;
const INFLUXDB_URL = 'https://gc-acc.antst.net';
const INFLUXDB_ORG = 'grca';
const INFLUXDB_KEY = 'QvDOolmSU478M5YkeD17nVeFb4FA_ngo-P0LNokCe6dS2Y10hxIa1zoQ1ZZ9RipKIds-TO7at1-Wgh7Qi44gAQ==';
const client = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_KEY });
const queryApi = client.getQueryApi(INFLUXDB_ORG);

app.use(express.static('public'));
app.set('view engine', 'ejs');

io.on('connection', (socket) => {
    socket.on('location', async (coordinations) => {
        const stations = await getClosestChargingStation(coordinations);
        sortedStations = await groupBy(stations, 'operatorName');
        // console.log(sortedStations)
    });
});

let sortedStations = null;

app.get('/', async (req, res) => {
    res.render('home')
});


const groupBy = (items, prop) => {
    return items.reduce((out, item) => {
        const value = item[prop];
        out[value] = out[value] || [];
        out[value].push(item);
        return out;
    }, {});
}

const getClosestChargingStation = async (coordinations) => {
    const latitude = coordinations.latitude;
    const longitude = coordinations.longitude;

    const url = `https://ui-map.shellrecharge.com/api/map/v2/markers/${longitude - 0.03}/${longitude + 0.03}/${latitude - 0.03}/${latitude + 0.03}/15`;
    let dataSet = null;



    await fetch(url)
        .then(res => res.json())
        .then(data => dataSet = data)
        .catch(err => console.log(err))

    const availableStations = dataSet.filter(data => {
        return data.status == 'Available'
    });

    io.emit('fill-in-data', availableStations);
    return availableStations;
}

async function getData() {
    const query = `from(bucket: "providers")
    |> range(start: -28h, stop: -27h)
    |> filter(fn: (r) => r["_measurement"] == "past_providers")`;

    // const query = `from(bucket: "elmap")
    // |> range(start: now(), stop: 48h)
    // |> filter(fn: (r) => r["_measurement"] == "forecast")
    // |> filter(fn: (r) => r["kind"] == "powerConsumptionBreakdown")
    // |> filter(fn: (r) => r["zone"] == "NL")
    // |> filter(fn: (r) => r["timeoffset"] == "baseline")
    // |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
    // |> sort(columns: ["_time"], desc: false)
    // |> yield(name: "mean")`;

    try {
        const rows = await queryApi.collectRows(query);
        const data = groupBy(rows, "_field");
        return data;
    } catch (error) {
        console.error(error);
        return [];
    }
}
getData();

app.use((req, res) => {
    res.status(404).send('Sorry, deze pagina kon ik niet vinden.');
});

server.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`);
});