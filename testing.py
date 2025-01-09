import cv2
import time
import os
from datetime import datetime

def capture_images(device_id=0, interval=2, save_dir="captured_images"):
    """
    Continuously capture images from camera at specified intervals
    
    Args:
        device_id (int): Camera device ID (0 or 1)
        interval (int): Time between captures in seconds
        save_dir (str): Directory to save images
    """
    # Create save directory if it doesn't exist
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        print(f"Created directory: {save_dir}")

    # Initialize camera
    cap = cv2.VideoCapture(device_id)
    
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open camera {device_id}")
    
    print(f"Started capturing from camera {device_id}")
    print(f"Saving images every {interval} seconds to {save_dir}")
    print("Press Ctrl+C to stop capturing")
    
    try:
        while True:
            # Capture frame
            ret, frame = cap.read()
            
            if ret:
                # Generate filename with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"capture_{timestamp}.jpg"
                filepath = os.path.join(save_dir, filename)
                
                # Save image
                cv2.imwrite(filepath, frame)
                print(f"Saved: {filepath}")
                
                # Wait for interval
                time.sleep(interval)
            else:
                print("Failed to capture frame")
                break
                
    except KeyboardInterrupt:
        print("\nCapture stopped by user")
    finally:
        cap.release()
        print("Camera released")

if __name__ == "__main__":
    # Get camera ID from user
    device_id = 0
    
    # Get capture interval
    interval = 2
    
    # Start capturing
    capture_images(device_id=device_id, interval=interval)