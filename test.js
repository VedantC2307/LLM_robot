// server.js
// -------------------------------------------------
// 1) npm install express https ws cors dotenv
// 2) Must have key.pem and cert.pem in same folder
// 3) Put SERVER_PORT=4000 in .env (optional)
// 4) node server.js
// -------------------------------------------------
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

const { SERVER_PORT } = process.env;
const port = SERVER_PORT || 4000;

// Load SSL cert + key
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(methodOverride());
app.use(errorHandler());

// Serve static files in /public
app.use(express.static('public'));

// 1) Example route for JSON
app.post('/webxlr-json', (req, res) => {
    console.log("Received JSON data from index.js:", req.body);
    broadcastToWebSocketClients(req.body);
    res.status(200).send("JSON received successfully");
});

// 2) Optional route to serve viewer page
app.get("/MobileCameraFeed", function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// Create an HTTPS server + WebSocket server
const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

// On new WS connection
wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established.');

    // e.g. if req.url = "/video-stream", then path = "video-stream"
    const path = req.url.split('/').pop();
    console.log("WebSocket path:", path);

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

// Broadcast a generic object to all clients
function broadcastToWebSocketClients(data) {
    const msg = {
        path: "webxlr-pos",
        message: data,
    };

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

async function handleWSMessage(ws, message, path) {
    let parsed_data;
    try {
        parsed_data = JSON.parse(message);
    } catch (e) {
        console.error("Invalid JSON:", e);
        return;
    }

    // If the client is sending video frames:
    if (path === 'video-stream') {
        // Typically { dataUrl: 'data:image/png;base64,...' }
        console.log("Received video frame dataUrl (truncated):",
            parsed_data.dataUrl?.substring(0,100) + "...");

        // Broadcast to everyone on the same path
        const broadcastMsg = {
            path: 'video-stream',
            message: parsed_data.dataUrl, // the base64 image
        };

        wss.clients.forEach((client) => {
            // If you want to exclude the sender, add `client !== ws`
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(broadcastMsg));
            }
        });

    } else {
        // Default: just broadcast
        const msg = { path, message: parsed_data };
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(msg));
            }
        });
    }
}

// Start server
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running over HTTPS on port ${port}`);
    console.log(`Open https://192.:${port}/MobileCameraFeed to test`);
});
