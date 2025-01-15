import asyncio
import websockets
import json

MOTOR_WS_URL = 'ws://192.168.0.214:5000'

async def send_motor_command():

    try:
        async with websockets.connect(MOTOR_WS_URL) as motor_ws:
            while True:
                motor_command = {"action": "FORWARD", "distance": 0.1}  # Mock command
                await motor_ws.send(json.dumps(motor_command))
                print(f"Motor command sent: {motor_command}")
                await asyncio.sleep(1)
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(1)

asyncio.run(send_motor_command())
