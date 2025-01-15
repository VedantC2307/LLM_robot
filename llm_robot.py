import asyncio
import ssl
import time
import websockets
import json
from openai import OpenAI
import base64
import cv2
import numpy as np
import os

    
WS_URL = 'wss://192.168.0.214:8888/video'
MOTOR_WS_URL = 'ws://192.168.0.214:5000'  # Motor control WebSocket

client = OpenAI(api_key = "")

last_saved_frame = None  
latest_prompt = None

def get_distance_to_object():
    return 5.0


def detect_object_with_gpt(b64_img, prompt):
    """
    Uses GPT-4-turbo to analyze an image and determine if the object is in the scene.
    """
    try:
        distance = get_distance_to_object()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a computer vision assistant specialized in object detection and localization. "
                        "You are mounted on a 4-wheel mobile robot. Your primary purpose is to decode what the user "
                        "is trying to find and find the specific objects in its environment. "
                        "You can generate the commands 'ROTATE' and 'MOVE_FORWARD' to move the camera to find the object requested. "
                        "If the object is not found in scene 'ROTATE' by 30 degrees. If object is found in the scene move 'FORWARD' "
                        "till the distance to the object is 0.05 meters. Only provide the output in a JSON object with the following information: "
                        "'command' : 'MOVE_FORWARD' or 'ROTATE', 'forward_distance': calcuate the distance to move according to the ultrasonic sensor data, 'rotate_degree': rotation angle if 'command' is 'ROTATE', "
                        "'object' : object to find, 'in_scene': if object is found in scene then True or else False.,"
                        "'description': A small description of what you see in the image and the next steps your are going to take as a robot.,"
                    ),
                },
                {"role": "user", "content": [
                    {"type": "text", "text": f"{prompt}? The current distance to the object in the square is {distance} cm."},
                    {"type": "image_url", "image_url": {
                        "url": b64_img
                    }}
                ]}
            ],
            response_format={"type": "json_object"}
        )

        response_content = response.choices[0].message.content
        return json.loads(response_content)
    except Exception as e:
        print(f"Error during GPT object detection: {e}")
        return None

async def send_motor_command(motor_command):
    try:
        async with websockets.connect(MOTOR_WS_URL) as motor_ws:
            await motor_ws.send(json.dumps(motor_command))
            print(f"Motor command sent: {motor_command}")
            await asyncio.sleep(0.5)
    except Exception as e:
        print(f"Error: {e}")
        await asyncio.sleep(0.5)

async def processWS():
    global last_saved_frame
    global latest_prompt

    ssl_context = ssl._create_unverified_context()
    async with websockets.connect(WS_URL, ssl=ssl_context) as websocket:
        while True:
            try:
                data = await websocket.recv()
                event = json.loads(data)
                # print("received data from websocket", event["path"])
                                
                if (event["path"] == "transcription"):
                    latest_prompt = event["message"]["prompt"]
                    print(f"\n\nPrompt Recieved: {latest_prompt}.\nFiring OpenAI API for inference on latest saved frame.\n\n")
                    last_saved_frame = capture_frame()
                    gpt_response = detect_object_with_gpt(last_saved_frame, latest_prompt)
                    print(gpt_response)

                    if gpt_response:
                            motor_command = parse_gpt_response(gpt_response)
                            if motor_command:
                                await send_motor_command(motor_command)

                if not latest_prompt:
                    print("Waiting for a command...")
                    continue             
            except Exception as e:
                print(e)
                break

def capture_frame():



def parse_gpt_response(gpt_response):
    """
    Parse the GPT-4 response and generate a motor command.

    "'command' : 'FORWARD' or 'ROTATE', 
    'forward_distance: distance to move forward in meters
    'rotate_degree': rotation angle if 'command' is 'ROTATE', "
    "'object' : object to find, 
    'in_scene': if object is found in scene then True or else False.,"
    "'description': A small description of what you see in the image and the next steps your are going to take as a robot.,"
    """
    if not gpt_response.get("command"):
        return None

    command = gpt_response["command"]
    if command == "ROTATE":
        return {
            "action": "ROTATE",
            "rotate_degree": gpt_response.get("rotate_degree", 0)
        }
    elif command == "FORWARD":
        return {
            "action": "FORWARD",
            "distance": gpt_response.get("forward_distance", 0)
        }
    return None


# Run the async functions and image capture concurrently
async def main():
    capture_task = asyncio.to_thread(capture_images)
    websocket_task = processWS()
    await asyncio.gather(capture_task, websocket_task)


asyncio.run(main())