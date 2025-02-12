import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime
import statistics

# Initialize Firebase Admin SDK
cred = credentials.Certificate("")
firebase_admin.initialize_app(cred, {
    'databaseURL': ""
})
ref = db.reference('/')

# Function to update speed estimation for a vehiacle
def update_speed(vehicle_id, speed, lane, vehicle_class):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ref.child('Speed Estimation').child(lane).child('Class').child(vehicle_class).child(timestamp).child(vehicle_id).set(speed)

# Function to update average speed for a lane
def update_lane_speed(lane, average_speed):
    ref.child('Speed Estimation').child(lane).child('Average Traffic Flow Speed').set(average_speed)

# Function to update historical data for a vehicle class
def update_class_speed(vehicle_class, vehicle_id, speed, lane):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ref.child('Speed Estimation').child(lane).child('Class').child(vehicle_class).child(timestamp).child(vehicle_id).set(speed)

def calculate_statistics(speeds):
    """
    Calculate median and mode of the given list of speeds.

    Args:
    - speeds (list): List of speed values.

    Returns:
    - median (float): Median speed.
    - mode (float): Mode speed.
    """
    if speeds:
        median = statistics.median(speeds)
        try:
            mode = statistics.mode(speeds)
        except statistics.StatisticsError:
            mode = median  # Fallback to median if no mode is found
        return median, mode
    return None, None
     
