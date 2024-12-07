# Import the move_motors function from robot_control_motor.py
from robot_controller.robot_control_motor import move_motors, stop_motors
import time


# Define movement directions in binary
MEC_STRAIGHT_FORWARD = 0b10101010
MEC_STRAIGHT_BACKWARD = 0b01010101
MEC_SIDEWAYS_RIGHT = 0b01101001
MEC_SIDEWAYS_LEFT = 0b10010110

def main():
    # Example usage of move_motors
    # Code to test Movement
    while True:
        print("Straight Forward")
        move_motors(50, 50, 50, 50, MEC_STRAIGHT_FORWARD)
        time.sleep(1)
        stop_motors()
        time.sleep(5)


if __name__ == "__main__":
    main()
