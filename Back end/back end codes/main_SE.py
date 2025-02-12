import cv2
import numpy as np
import supervision as sv
from ultralytics import YOLO
from collections import defaultdict, deque
from database_SE import *
import time
import uuid  # Importing uuid module for generating UUIDs
import threading


# Define the sources for the left and right lanes
LEFT_LANE_SOURCE = np.array([[280, 212], [0, 639], [370, 639], [330, 212]])
RIGHT_LANE_SOURCE = np.array([[330, 212], [370, 639], [739, 639], [377, 212]])

# Define TARGET, TARGET_WIDTH, and TARGET_HEIGHT for the left lane
LEFT_LANE_TARGET_WIDTH = 7.5
LEFT_LANE_TARGET_HEIGHT = 70
LEFT_LANE_TARGET = np.array([
    [0, 0],
    [0, LEFT_LANE_TARGET_HEIGHT - 1],
    [LEFT_LANE_TARGET_WIDTH - 1, LEFT_LANE_TARGET_HEIGHT - 1],
    [LEFT_LANE_TARGET_WIDTH - 1, 0]
])

# Define TARGET, TARGET_WIDTH, and TARGET_HEIGHT for the right lane
RIGHT_LANE_TARGET_WIDTH = 7.5
RIGHT_LANE_TARGET_HEIGHT = 70
RIGHT_LANE_TARGET = np.array([
    [0, 0],
    [0, RIGHT_LANE_TARGET_HEIGHT - 1],
    [RIGHT_LANE_TARGET_WIDTH - 1, RIGHT_LANE_TARGET_HEIGHT - 1],
    [RIGHT_LANE_TARGET_WIDTH - 1, 0]
])

# Initial calibration factor for speed estimation
# Adjust this factor based on calibration results
CALIBRATION_FACTOR = 1

# Define coordinates and speeds for each lane at the top level
coordinates_left = defaultdict(lambda: deque(maxlen=30))
coordinates_right = defaultdict(lambda: deque(maxlen=30))
speeds_left = defaultdict(list)  # Dictionary to store speeds of vehicles in left lane
speeds_right = defaultdict(list)  # Dictionary to store speeds of vehicles in right lane

class ViewTransformer:
    def __init__(self, source: np.ndarray, target: np.ndarray):
        source = source.astype(np.float32)
        target = target.astype(np.float32)
        self.m = cv2.getPerspectiveTransform(source, target)

    def transform_points(self, points: np.ndarray) -> np.ndarray:
        reshaped_points = points.reshape(-1, 1, 2).astype(np.float32)
        transformed_points = cv2.perspectiveTransform(reshaped_points, self.m)
        if transformed_points is None:
            print("Error: Unable to perform perspective transformation.")
            return None
        return transformed_points.reshape(-1, 2)

def update_lane_statistics():
    """
    Update and send median and mode of speeds for left and right lanes to Firebase in real-time.

    Args:
    - None

    Returns:
    - None
    """
    while True:
        median_left, mode_left = calculate_statistics([speed for class_speeds in speeds_left.values() for speed in class_speeds])
        median_right, mode_right = calculate_statistics([speed for class_speeds in speeds_right.values() for speed in class_speeds])

        statistics_data = {
            "Statistics": {
                "Left lane": {
                    "median": f"{int(median_left)}" if median_left is not None else "N/A",
                    "mode": f"{int(mode_left)}" if mode_left is not None else "N/A"
                },
                "Right lane": {
                    "median": f"{int(median_right)}" if median_right is not None else "N/A",
                    "mode": f"{int(mode_right)}" if mode_right is not None else "N/A"
                }
            }
        }

        update_lane_speed('Speed Estimation', statistics_data)
        time.sleep(5)  # Update 5 seconds  

def main():
    # Initialize YOLO model
    model = YOLO("bestn.pt")
    model = model.to('cuda')
    byte_track = sv.ByteTrack(frame_rate=30)  # Adjust frame rate as needed

    # Get class names from YOLO model
    names = model.names

    # Define polygon zones for left and right lanes
    left_polygon_zone = sv.PolygonZone(LEFT_LANE_SOURCE, frame_resolution_wh=(640, 640))
    right_polygon_zone = sv.PolygonZone(RIGHT_LANE_SOURCE, frame_resolution_wh=(640, 640))

    # Define ViewTransformers for left and right lanes
    view_transformer_left = ViewTransformer(source=LEFT_LANE_SOURCE, target=LEFT_LANE_TARGET)
    view_transformer_right = ViewTransformer(source=RIGHT_LANE_SOURCE, target=RIGHT_LANE_TARGET)

    # Define coordinates for each lane
    # Adjust deque length for fps
    coordinates_left = defaultdict(lambda: deque(maxlen=30))
    coordinates_right = defaultdict(lambda: deque(maxlen=30))
    global speeds_left, speeds_right
    speeds_left = defaultdict(list)  # Dictionary to store speeds of vehicles in left lane
    speeds_right = defaultdict(list)  # Dictionary to store speeds of vehicles in right lane

    # Initialize webcam
    cap = cv2.VideoCapture("test.MP4")
    assert cap.isOpened(), "Error opening webcam"

    # Initialize moving average deque for speed smoothing
    # Adjust the window size for smoothing
    speed_left_history = deque(maxlen=10)
    speed_right_history = deque(maxlen=10)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Unable to capture frame from webcam.")
            break

        # Resize frame to 640x640
        frame = cv2.resize(frame, (640, 640))

        # Perform YOLO model inference
        result = model(frame, conf=0.1, device=0)

        # Check if inference result is not None and has detections
        if result is not None and len(result) > 0:
            result = result[0]
            detections = sv.Detections.from_ultralytics(result)

            # Filter detections based on polygon zones
            left_detections = detections[left_polygon_zone.trigger(detections)]
            right_detections = detections[right_polygon_zone.trigger(detections)]

            # Update byte track with detections
            detections = byte_track.update_with_detections(detections=detections)

            # Process left lane detections
            if len(left_detections) > 0:
                points_left = left_detections.get_anchors_coordinates(anchor=sv.Position.BOTTOM_CENTER)
                labels_left = []

                if points_left is not None:
                    points_left = view_transformer_left.transform_points(points=points_left)
                    if points_left is not None:
                        points_left = points_left.astype(int)
                        for class_id, [_, y] in zip(left_detections.class_id, points_left):
                            class_label = model.names[class_id]
                            vehicle_id = str(uuid.uuid4())
                            coordinates_left[class_label].append(y)
                            if len(coordinates_left[class_label]) >= 15:
                                coordinate_start = coordinates_left[class_label][-1]
                                coordinate_end = coordinates_left[class_label][0]
                                distance = abs(coordinate_start - coordinate_end)
                                time = len(coordinates_left[class_label]) / 30
                                speed_left = distance / time * 3.6 * CALIBRATION_FACTOR
                                if not np.isnan(speed_left):  # Check for NaN
                                    speed_left_history.append(speed_left)
                                    smoothed_speed_left = np.mean(speed_left_history)
                                    labels_left.append(f"{class_label} {int(smoothed_speed_left)}km/h")
                                    update_speed(vehicle_id, int(smoothed_speed_left), 'Left Lane', class_label)  # Update Firebase speed
                                    update_class_speed(class_label, vehicle_id, int(smoothed_speed_left), 'Left Lane')  # Update Firebase class speed
                                    speeds_left[class_label].append(speed_left)  # Store speed for average calculation
                            else:
                                labels_left.append(f"{class_label}")
                    else:
                        print("Error: Unable to transform points for left lane.")
                else:
                    print("Error: No anchor points detected in left lane.")

                # Apply label annotations for left lane
                frame = sv.LabelAnnotator(text_scale=0.5, text_thickness=1).annotate(
                    scene=frame, detections=left_detections, labels=labels_left
                )

            # Process right lane detections
            if len(right_detections) > 0:
                points_right = right_detections.get_anchors_coordinates(anchor=sv.Position.BOTTOM_CENTER)
                labels_right = []

                if points_right is not None:
                    points_right = view_transformer_right.transform_points(points=points_right)
                    if points_right is not None:
                        points_right = points_right.astype(int)
                        for class_id, [_, y] in zip(right_detections.class_id, points_right):
                            class_label = model.names[class_id]
                            vehicle_id = str(uuid.uuid4())  # Generate a unique UUID for the vehicle
                            coordinates_right[class_label].append(y)
                            if len(coordinates_right[class_label]) >= 15:
                                coordinate_start = coordinates_right[class_label][-1]
                                coordinate_end = coordinates_right[class_label][0]
                                distance = abs(coordinate_start - coordinate_end)
                                time = len(coordinates_right[class_label]) / 30
                                speed_right = distance / time * 3.6 * CALIBRATION_FACTOR
                                if not np.isnan(speed_right):  # Check for NaN
                                    speed_right_history.append(speed_right)
                                    smoothed_speed_right = np.mean(speed_right_history)
                                    labels_right.append(f"{class_label} {int(smoothed_speed_right)}km/h")
                                    update_speed(vehicle_id, int(smoothed_speed_right), 'Right Lane', class_label)  # Update Firebase speed
                                    update_class_speed(class_label, vehicle_id, int(smoothed_speed_right), 'Right Lane')  # Update Firebase class speed
                                    speeds_right[class_label].append(speed_right)  # Store speed for average calculation
                            else:
                                labels_right.append(f"{class_label}")
                    else:
                        print("Error: Unable to transform points for right lane.")
                else:
                    print("Error: No anchor points detected in right lane.")

                # Apply label annotations for right lane
                frame = sv.LabelAnnotator(text_scale=0.5, text_thickness=1).annotate(
                    scene=frame, detections=right_detections, labels=labels_right
                )

            # Draw lanes
            frame = sv.draw_polygon(frame, polygon=LEFT_LANE_SOURCE, color=sv.Color.red())
            frame = sv.draw_polygon(frame, polygon=RIGHT_LANE_SOURCE, color=sv.Color.red())

            # Apply bounding box annotations
            frame = sv.BoundingBoxAnnotator(thickness=1).annotate(scene=frame, detections=detections)

            # Update average lane speeds
            average_speed_left = np.mean([np.mean(speeds_left[class_label]) for class_label in speeds_left if speeds_left[class_label]])  # Filter out empty lists
            average_speed_right = np.mean([np.mean(speeds_right[class_label]) for class_label in speeds_right if speeds_right[class_label]])  # Filter out empty lists
            if not np.isnan(average_speed_left):  # Check for NaN
                update_lane_speed('Left Lane', {"Avarage Traffic Flow Speed leftlane": int(average_speed_left)})
            if not np.isnan(average_speed_right):  # Check for NaN
                update_lane_speed('Right Lane', {"Avarage Traffic Flow Speed rightlane": int(average_speed_right)})

            cv2.imshow("Annotated Frame", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


def run_main():
    main()

if __name__ == "__main__":
    # Create a thread for running the main function
    thread_main = threading.Thread(target=run_main)

    # Start the main thread
    thread_main.start()
    
    # Create a thread for updating lane statistics
    thread_statistics = threading.Thread(target=update_lane_statistics)

    # Start the statistics thread
    thread_statistics.start()

    # Wait for the main thread to finish
    thread_main.join()
    thread_statistics.join()