import RPi.GPIO as GPIO
import time

# Set GPIO mode
GPIO.setmode(GPIO.BCM)

# Define GPIO pins for Trig and Echo
TRIG_PIN = 17  # Replace with your Trig pin
ECHO_PIN = 27  # Replace with your Echo pin

# Set up the GPIO pins
GPIO.setup(TRIG_PIN, GPIO.OUT)
GPIO.setup(ECHO_PIN, GPIO.IN)

def get_distance():
    # Send a 10us pulse to the TRIG pin
    GPIO.output(TRIG_PIN, True)
    time.sleep(0.00001)  # 10 microseconds
    GPIO.output(TRIG_PIN, False)

    # Wait for the echo to start (ECHO goes HIGH)
    start_time = time.time()
    while GPIO.input(ECHO_PIN) == 0:
        start_time = time.time()

    # Wait for the echo to end (ECHO goes LOW)
    stop_time = time.time()
    while GPIO.input(ECHO_PIN) == 1:
        stop_time = time.time()

    # Calculate the time difference
    time_elapsed = stop_time - start_time

    # Distance = Time * Speed of Sound (34300 cm/s) / 2 (round trip)
    distance = (time_elapsed * 34300) / 2

    return distance

try:
    while True:
        dist = get_distance()
        print(f"Distance: {dist:.2f} cm")
        time.sleep(1)  # Delay for 1 second
except KeyboardInterrupt:
    print("Measurement stopped by user")
finally:
    GPIO.cleanup()
