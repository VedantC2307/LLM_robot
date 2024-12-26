import asyncio
import ssl
import websockets
import json

async def connect_to_server():
    WS_URL = "wss://localhost:4000"
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    async with websockets.connect(WS_URL, ssl=ssl_context) as websocket:
        print("Connected to WebSocket server.")

        try:
            async for message in websocket:
                try:
                    # Parse the received JSON message
                    data = json.loads(message)

                    # Check if the "path" field exists and filter messages
                    if "path" in data:
                        if data["path"] == "webxlr-pos":  # Process only messages with this path, webxlr-pos, video-stream
                            print("Filtered message:", json.dumps(data, indent=4))
                        else:
                            print("Skipping message with path:", data["path"])
                    else:
                        print("Received message without path:", data)

                except json.JSONDecodeError:
                    print("Received non-JSON message:", message)

        except websockets.ConnectionClosed as e:
            print(f"Connection closed: {e}")

if __name__ == "__main__":
    asyncio.run(connect_to_server())
