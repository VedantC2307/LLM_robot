const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const errorHandler = require('errorhandler');
const methodOverride = require('method-override');
const WebSocket = require('ws');

const app = express();
const port = 4000; // HTTPS typically runs on port 443

// Load the SSL certificate and key
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

app.use(cors());

app.get("/MobileCameraFeed", function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static('public'));
app.use(methodOverride());
app.use(errorHandler());

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


async function handleWSMessage(ws, message, path) {
    switch(path) {
        case "video-stream":
            handleVideoFrames(ws, message);
            break;

        case "transcription":
            handleTranscription(message);
            break;

        default:
            break;
    }
}

function handleTranscription(message) {
    let msg = JSON.parse(message);
    console.log("Prompt Received: ", msg);
    // TODO: Implement prompt processing and VLM retrieval
}

async function handleVideoFrames(ws, message) {
    // Here we receive the binary data (JPEG frame) from the client
    // const msg = JSON.parse(message);
    console.log('Received video frame');
    
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    // TODO: Implement the processing of the received video frame
}

// Start the HTTPS server
server.listen(port, '0.0.0.0',() => {
    console.log(`Server is running over HTTPS on port ${port}/MobileCameraFeed`);
});
