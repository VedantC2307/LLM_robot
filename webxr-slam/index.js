#!/usr/bin/env node

var port = parseInt(process.argv[2] || 8888);

var qrcode = require('qrcode-terminal');
const chalk = require('chalk')

const https = require("https");
const fs = require("fs");
const path = require('path');

// Load SSL certificate and private key
const options = {
    key: fs.readFileSync(path.join(__dirname, '../key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../cert.pem')), 
};

function sendJsonToReceiver(jsonData) {
    const postData = JSON.stringify(jsonData);

    const options = {
        hostname: 'localhost', // Replace with the IP or hostname of the receiver server
        port: 4000,            // Port of the receiver server
        path: '/webxlr-json', // Endpoint on the receiver server
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
        },
        rejectUnauthorized: false, // Allow self-signed certificates
    };

    const req = https.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    // Write data to request body
    req.write(postData);
    req.end();
}

function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }
    return '0.0.0.0';
}

var ipAddr = getIPAddress();

const express = require('express');
const app = express();
// const server = require('http').Server(app);
const server = https.createServer(options, app);
const url = require('url');

const WebSocket = require('ws');

const wss1 = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });

const wssVideo = new WebSocket.Server({ noServer: true }); //1

// const intWS = new WebSocket('wss://localhost:' + port + '/xr-slam-server');

const intWS = new WebSocket(`wss://localhost:${port}/xr-slam-server`, {
    rejectUnauthorized: false, // Accept self-signed certificates
});

intWS.on('error', (err) => {
    console.error('WebSocket error:', err.message);
});
    

// camera websocket
wss1.on('connection', function connection(ws) {
    ws.on('message', function incoming(message, isBinary = false) {
        //console.log('%s', message);
        wss2.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message, { binary: isBinary });
            }
        });
    });
});

// webbrowser websocket
wss2.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        // nothing here should be received
        console.log('received wss2: %s', message);
    });
});

// wssVideo => the new video-stream websocket
wssVideo.on('connection', function (ws) {
    console.log('New WebSocket connection on /video-stream');
    ws.on('message', function (message) {
        // Typically your client is sending JSON with { dataUrl: '...' }
        // For a quick test, just log it:
        // console.log('Video frame received from client:', message.toString().slice(0,100), '...');

        // If you want to broadcast the frames to all connected video clients:
        wssVideo.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});


server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/xr-slam-server') {
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws, request);
        });
    } else if (pathname === '/xr-slam-client') {
        wss2.handleUpgrade(request, socket, head, function done(ws) {
            wss2.emit('connection', ws, request);
        });
    } else if (pathname === '/video-stream') {
        // ADD THIS BLOCK to handle the camera’s video-stream route
        wssVideo.handleUpgrade(request, socket, head, function done(ws) {
            wssVideo.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

app.get("/", function (req, res) {
    res.sendFile(__dirname + '/docs/index1.html');
});

app.get("/test", function (req, res) {
    res.sendFile(__dirname + '/docs/test.html');
});

app.get("/numberofclients", function (req, res) {
    var numberofclient = wss2.clients.size;
    res.writeHead(200, { 'Content-Type': 'text/plain' }); // send response header
    res.end(numberofclient.toString()); // send response body
});

app.get("/data", function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' }); // send response header
    console.log(req.query);
    console.log(chalk.black.bgGreen(`Test Page:\n http://${ipAddr}:${port}/test/`));
    console.log(chalk.white(`WebSocket Client: wss://${ipAddr}:${port}/xr-slam-client\n`));

    sendJsonToReceiver(req.query);

    res.end(''); // send response body
    if(intWS.readyState === WebSocket.OPEN) {
        intWS.send(JSON.stringify(req.query));
    }
    else {
        intWS = new WebSocket('wss://localhost:' + port + '/xr-slam-server');
        intWS.send(JSON.stringify(req.query));
    }

});

app.get("/sendData", function (req, res) {
    res.end('ok'); // send response body
});


app.use(express.static(__dirname + '/docs'));

var x = `https://${ipAddr}:${port}/test`;

server.listen(port, () => {
    qrcode.generate(`http://${ipAddr}:${port}`, { small: true }, function (qrcode) {
        console.log(qrcode);
        console.log(chalk.blue.bgWhite(`Connect mobile browser to:`));
        console.log(chalk.blue(`https://${ipAddr}:${port}/\n`));
        console.log(chalk.black.bgGreen(`Test Page:\n https://${ipAddr}:${port}/test/`));
        console.log(chalk.white(`WebSocket Client: wss://${ipAddr}:${port}/xr-slam-client\n`));
    });
});

