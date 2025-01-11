const dotenv = require("dotenv");
dotenv.config();

const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const errorHandler = require('errorhandler');
const methodOverride = require('method-override');
const WebSocket = require('ws');
const bodyParser = require('body-parser'); // Middleware for parsing JSON
// const { path } = require("express/lib/application");

const { SERVER_PORT } = process.env;

const app = express();
const port = SERVER_PORT || 4000;

// Load the SSL certificate and key
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

app.use(cors());
app.use(bodyParser.json()); // Middleware for parsing JSON bodies
app.use(express.static('public'));
app.use(methodOverride());
app.use(errorHandler());

// Define a new route to handle JSON data from `index.js`
app.post('/webxlr-json', (req, res) => {
    console.log("Received JSON data from index.js:", req.body);

    // Broadcast received data to all WebSocket clients
    broadcastToWebSocketClients(req.body);

    res.status(200).send("JSON received successfully");
});

app.get("/MobileCameraFeed", function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// Create an HTTPS server
const server = https.createServer(options, app);

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established.');

    let path = req.url.split('/').pop();
    console.log(path);

    ws.on('message', (message) => {
        handleWSMessage(ws, message, path);
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed.');
    });

    ws.on('error', (err) => {
        console.error('WebSocket error: ', err);
    });
});

// Broadcast function for WebSocket clients
function broadcastToWebSocketClients(data) {
    const msg = {
        path: "webxlr-pos", // Identify the source of the data
        message: data,
         
    };

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

async function handleWSMessage(ws, message, path) {
    const parsed_data = JSON.parse(message);
    let msg = {
        path,
        "message": parsed_data
    };
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

// Start the HTTPS server
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running over HTTPS on port 192.168.0.214:${port}/MobileCameraFeed`);
});

