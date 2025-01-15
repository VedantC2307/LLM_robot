import asyncio
import websockets
import json

HOST = '0.0.0.0'
PORT = 5000

async def handle_motor_commands(websocket):
    """
    Handle incoming motor commands over the WebSocket.
    """
    print(f"Motor WebSocket server started on {HOST}:{PORT}")
    try:
        while True:
            # Wait for a message (motor command)
            data = await websocket.recv()
            motor_command = json.loads(data)
            print(f"Received motor command: {motor_command}")
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Connection closed: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

async def main():
    print(f"Starting Motor WebSocket server on {HOST}:{PORT}")
    server = await websockets.serve(handle_motor_commands, HOST, PORT)
    await server.wait_closed()

asyncio.run(main())
