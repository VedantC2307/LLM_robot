const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const saveDirectory = './frames'; // Directory to save frames
let frameCounter = 0; // Counter for sequential naming

// Ensure the directory exists
if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
    console.log(`Created directory: ${saveDirectory}`);
}

// Function to initialize the WebSocket connection
function createWebSocketConnection() {
    const socket = new WebSocket('ws    s://192.168.0.214:8888/video', {
        rejectUnauthorized: false,
    });

    socket.on('open', () => {
        console.log('WebSocket connection established.');
    });

    socket.on('message', (data) => {
        // Check if data is a buffer or string
        if (!(data instanceof Buffer)) {
            console.error('Received data is not a Buffer. Check server-side encoding.');
            return;
        }

        const filename = `frame_${frameCounter++}.jpg`;
        const filePath = path.join(saveDirectory, filename);

        // Save raw binary data directly
        fs.writeFile(filePath, data, (err) => {
            if (err) {
                console.error(`Error saving frame ${filename}:`, err.message);
            } else {
                console.log(`Frame saved: ${filePath}`);
            }
        });
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });

    socket.on('close', () => {
        console.log('WebSocket closed. Reconnecting...');
        setTimeout(createWebSocketConnection, 2000); // Attempt to reconnect after 5 seconds
    });

    return socket;
}

// Initialize the WebSocket connection
createWebSocketConnection();
