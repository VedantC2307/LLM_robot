import asyncio
import ssl
import websockets
import json
import time
import math
# from robot_controller.robot_control_motor import move_motors, stop_motors

# Global variable for storing the latest pose received from WebSocket
latest_pose = None

# Define movement directions as binary masks
MEC_STRAIGHT_FORWARD = 0b10101010  # Binary direction mask for straight forward motion

class PID:
    """
    PID Controller Class.
    Implements a PID control loop to calculate control outputs based on error.
    """
    def __init__(self, kp, ki, kd):
        self.kp = kp  # Proportional gain
        self.ki = ki  # Integral gain
        self.kd = kd  # Derivative gain
        self.prev_error = 0  # Error from the previous control step
        self.integral = 0  # Accumulated integral of errors

    def compute(self, error, dt):
        """
        Compute the control output based on the PID formula.

        Parameters:
            error (float): The difference between target and current value.
            dt (float): Time step between control updates.

        Returns:
            float: The computed control output.
        """
        self.integral += error * dt  # Accumulate error over time
        derivative = (error - self.prev_error) / dt  # Rate of error change
        self.prev_error = error  # Update previous error for next step
        return self.kp * error + self.ki * self.integral + self.kd * derivative

def quaternion_to_yaw(qx, qy, qz, qw):
    """
    Convert quaternion orientation to yaw angle.

    Parameters:
        qx, qy, qz, qw (float): Quaternion components.

    Returns:
        float: The yaw angle in radians.
    """
    # Yaw - Z
    # t3 = 2.0 * (qw * qz + qx * qy)
    # t4 = 1.0 - 2.0 * (qy**2 + qz**2)
    # yaw = math.atan2(t3, t4)

    # Pitch - Y
    # t2 = +2.0 * (qw * qy - qz * qx)
    # t2 = +1.0 if t2 > +1.0 else t2
    # t2 = -1.0 if t2 < -1.0 else t2
    # pitch_y = math.asin(t2)

    # Roll - X
    t0 = +2.0 * (qw * qx + qy * qz)
    t1 = +1.0 - 2.0 * (qx * qx + qy * qy)
    roll_x = math.atan2(t0, t1)
    roll_degrees = math.degrees(roll_x)

    return roll_degrees

def extract_pose(message):
    """
    Extract the robot's pose (x, y, yaw) from a filtered WebSocket message.

    Parameters:
        filtered_message (dict): JSON object containing robot pose data.

    Returns:
        tuple: (x, y, yaw), where yaw is derived from the quaternion.
    """
    x = float(message["x"])  # X-coordinate
    y = float(message["y"])  # Y-coordinate
    z = float(message["z"])
    qx = float(message["qx"])  # Quaternion x
    qy = float(message["qy"])  # Quaternion y
    qz = float(message["qz"])  # Quaternion z
    qw = float(message["qw"])  # Quaternion w

    # Convert quaternion to yaw (rotation around Z-axis)
    yaw = quaternion_to_yaw(qx, qy, qz, qw)
    print(yaw)
    return x, -z, yaw

def get_pose():
    """
    Retrieve the latest pose.

    Returns:
        tuple: (x, y, yaw)

    Raises:
        RuntimeError: If pose data is not available after a timeout.
    """
    if latest_pose is not None:
        return latest_pose
    else:
        raise ValueError("Pose data is not available yet.")


async def listen_to_websocket():
    """
    Connect to the WebSocket server and continuously listen for pose updates.
    Updates the global `latest_pose` variable with new data.
    """
    WS_URL = "wss://localhost:4000"
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    global latest_pose

    async with websockets.connect(WS_URL, ssl=ssl_context) as websocket:
        print("Connected to WebSocket server.")

        async for message in websocket:
            try:
                # Parse incoming JSON messages
                data = json.loads(message)

                # Filter messages by the "path" field
                if "path" in data and data["path"] == "webxlr-pos":
                    # Extract pose from the "message" field
                    if "message" in data:
                        # print("Updated pose:", data["message"])
                        latest_pose = extract_pose(data["message"])
                    else:
                        print("Message field missing in data:", data)
                else:
                    print("Skipping message with path:", data.get("path"))
            except json.JSONDecodeError:
                print("Invalid JSON received:", message)


async def translate_robot_with_websocket(target_distance, dt =0.1): #, move_motors, stop_motors, dt=0.1):
    """
    Control loop to move the robot a specified distance in its current direction.

    Parameters:
        target_distance (float): Distance to move (in cm, mm, etc.).
        move_motors (function): Function to set motor speeds.
        stop_motors (function): Function to stop all motors.
        dt (float): Time step for the control loop.
    """
    pid = PID(kp=1.0, ki=0.0, kd=0.1)  # PID controller initialization (tune gains as needed)

    # Get the starting position
    x_start, z_start, _ = get_pose()
    z_target = z_start + target_distance  # Target z-coordinate
    x_target = x_start  # Maintain the same x-coordinate

    # Motor speed limits
    PWM_MIN = 100
    PWM_MAX = 150

    while True:
        # Get the current position
        x_current, z_current, _ = get_pose()

        # Calculate the remaining distance to the target
        distance_remaining = math.sqrt((z_target - z_current)**2 + (x_target - x_current)**2)

        # Compute motor speed using PID
        pid_output = pid.compute(distance_remaining, dt)

        # Scale PID output to motor PWM range
        speed = max(PWM_MIN, min(PWM_MAX, PWM_MIN + (pid_output * (PWM_MAX - PWM_MIN) / 100)))

        # print("distance_remaining:", distance_remaining)
        # print("pid_output:", pid_output)
        # print("speed:", speed)


        # Stop the robot if within the threshold
        if distance_remaining < 0.01:  # Threshold for stopping (adjust as needed)
            # stop_motors()
            break

        # Move motors forward with computed speed
        # move_motors(0,0,0,0, MEC_STRAIGHT_FORWARD)

        # Wait for the next control cycle
        await asyncio.sleep(dt)

async def main():
    """
    Main function to run the WebSocket listener and control loop concurrently.
    """
    # Start the WebSocket listener
    websocket_task = asyncio.create_task(listen_to_websocket())

    # Allow time for pose data to initialize
    await asyncio.sleep(2)

    try:
        # Example: Move the robot 10 units forward
        await translate_robot_with_websocket(target_distance=5)#, move_motors=move_motors, stop_motors=stop_motors)
    finally:
        websocket_task.cancel()  # Stop the WebSocket listener when done

if __name__ == "__main__":
    asyncio.run(main())
