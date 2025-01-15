let socket = new WebSocket('wss://192.168.0.214:8888/video-stream');

socket.onopen = () => {
    console.log('WebSocket connection established.');
};

socket.onmessage = (event) => {
    const imgElement = document.getElementById('camera-frame');
    imgElement.src = event.data; // Assuming `event.data` is a Base64 string
    console.log('Frame received.');
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

socket.onclose = () => {
    console.log('WebSocket closed. Reconnecting...');
    setTimeout(() => {
        socket = new WebSocket('wss://192.168.0.214:8888/video-stream');
    }, 5000);
};
