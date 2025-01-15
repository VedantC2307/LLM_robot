import asyncio
import websockets
import ssl
import os
from datetime import datetime

async def save_camera_frames():
    """
    Connects to a WebSocket server at /video, listens for binary image data,
    and saves the frames to disk every 1 second.
    """
    WS_URL = "wss://192.168.0.214:8888/video"
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    # Ensure the output directory exists
    output_dir = "saved_frames"
    os.makedirs(output_dir, exist_ok=True)

    async with websockets.connect(WS_URL, ssl=ssl_context) as websocket:
        print("Connected to WebSocket server at /video.")
        last_saved_time = datetime.now()

        async for message in websocket:
            # Check if the message is binary (image frame)
            if isinstance(message, bytes):
                current_time = datetime.now()
                # Save the frame only if 1 second has passed
                if (current_time - last_saved_time).total_seconds() >= 1:
                    timestamp = current_time.strftime("%Y%m%d_%H%M%S")
                    filename = os.path.join(output_dir, f"frame_{timestamp}.jpg")
                    with open(filename, "wb") as file:
                        file.write(message)
                    print(f"Saved frame to {filename}")
                    last_saved_time = current_time
            else:
                print("Received non-binary message:", message)

# Run the WebSocket client
if __name__ == "__main__":
    try:
        asyncio.run(save_camera_frames())
    except KeyboardInterrupt:
        print("WebSocket client stopped.")
