import cv2
import time
import queue
import cvzone
import threading
import numpy as np
import pandas as pd
from database_VC import *
from ultralytics import YOLO
from object_tracker import *
from datetime import datetime, timedelta
from uuid import uuid4

def process_bbox(area_polygon, input_frame, bounding_boxes, object_ids):
    """
    Annotates objects inside a specified area on a frame.

    Args:
        area_polygon (list): List of points defining the area polygon.
        input_frame (numpy.ndarray): Input frame where objects are to be annotated.
        bounding_boxes (list): List of bounding boxes (xmin, ymin, xmax, ymax, obj_id).
        object_ids (list): List of object IDs.

    Returns:
        tuple: A tuple containing the annotated frame and the count of objects inside the area.
    """
    for bbox in bounding_boxes:
        xmin, ymin, xmax, ymax, obj_id = bbox
        cx = (xmin + xmax) // 2
        cy = (ymin + ymax) // 2
        result = cv2.pointPolygonTest(np.array(area_polygon, np.int32), (cx, cy), False)

        if result >= 0:
            cv2.rectangle(input_frame, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)
            cvzone.putTextRect(input_frame, f'{obj_id}', (xmin, ymin), 1, 1)
            if obj_id not in object_ids:
                object_ids.append(obj_id)

    object_count = len(object_ids)

    return input_frame, object_count


def process_video(stream_path, class_path, model, bicycle, bus, car, e_bike, jeep, motorcycle, tricycle, truck, van,
                  output_file_name):
    """
    Process a video stream to detect and count various types of vehicles.

    Args:
    - stream_path (str): Path to the video stream.
    - class_path (str): Path to the file containing class labels.
    - model: Pre-trained object detection model.
    - bicycle: Object representing the bicycle detector.
    - bus: Object representing the bus detector.
    - car: Object representing the car detector.
    - e_bike: Object representing the e-bike detector.
    - jeep: Object representing the jeep detector.
    - motorcycle: Object representing the motorcycle detector.
    - tricycle: Object representing the tricycle detector.
    - truck: Object representing the truck detector.
    - van: Object representing the van detector.
    - output_file_name (str): Path to save the processed video.

    Returns:
    - None

    This function processes each frame of the video stream, detects vehicles, counts them in real-time, and displays
    the counts along with the annotated frames. It also saves the processed video.
    """
    cap = cv2.VideoCapture(stream_path)

    # Define codec for video saving
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')

    # Get video properties
    fps = 25.0
    frame_width = 640
    frame_height = 640

    # Define output VideoWriter object
    out = cv2.VideoWriter(output_file_name, fourcc, fps, (frame_width, frame_height))

    my_file = open(class_path, "r")
    data = my_file.read()
    class_list = data.split("\n")

    count = 0

    left_lane_counts = {
        'bicycle': [],
        'bus': [],
        'car': [],
        'e_bike': [],
        'jeep': [],
        'motorcycle': [],
        'tricycle': [],
        'truck': [],
        'van': []
    }

    right_lane_counts = {
        'bicycle': [],
        'bus': [],
        'car': [],
        'e_bike': [],
        'jeep': [],
        'motorcycle': [],
        'tricycle': [],
        'truck': [],
        'van': []
    }

    # Define a queue to store frames for saving
    frame_queue = queue.Queue()

    def save_frame(frame_queue_func):
        while True:
            frame_func = frame_queue_func.get()
            if frame_func is None:
                break
            out.write(frame_func)

    # Create thread for saving frames
    save_thread = threading.Thread(target=save_frame, args=(frame_queue,))
    save_thread.start()

    font_scale = 1

    area1 = [(108, 477), (85, 513), (359, 513), (356, 477)]
    area2 = [(356, 477), (359, 513), (627, 513), (601, 477)]
    
    # Initialize historical data
    historical_data1 = None
    
    def send_historical_data():
        nonlocal historical_data1
        while True:
            if historical_data1:
                set_historical_vehicle_counts('Historical Data', historical_data)
                historical_data = None
            time.sleep(10)  # Send historical data every 60 seconds

    # Create thread for sending historical data
    historical_data_thread = threading.Thread(target=send_historical_data)
    historical_data_thread.start()
    
    def send_lane_data():
        nonlocal left_lane_counts, right_lane_counts

        while True:
            if left_lane_counts or right_lane_counts:
                current_time = datetime.now()
                adjusted_time = current_time - timedelta(hours=9)
                utc_plus_8_time = adjusted_time + timedelta(hours=8)
                formatted_date = utc_plus_8_time.strftime('%B %d, %Y at %I:%M:%S %p UTC+8')

                historical_data = {
                    'Left Lane': left_lane_counts,
                    'Right Lane': right_lane_counts
                }

                # Construct data based on the given structure
                data = {}
                for lane, counts in historical_data.items():
                    data[lane] = {}
                    for vehicle, ids in counts.items():
                        data[lane][vehicle] = {}
                        for obj_id in ids:
                            data[lane][vehicle][str(uuid4())] = {"Count": 1, "Datetime": formatted_date}

                # Send historical data
                set_historical_vehicle_counts('Image Processing', data)

                # Reset the counts
                left_lane_counts = {k: [] for k in left_lane_counts}
                right_lane_counts = {k: [] for k in right_lane_counts}

            time.sleep(10)  # Send data every 10 seconds


    # Create thread for sending lane data
    lane_data_thread = threading.Thread(target=send_lane_data)
    lane_data_thread.start()

    while True:
        ret, frame = cap.read()

        try:
            if not ret:
                raise Exception("Error reading frames from the live stream")
        except Exception as e:
            print(f"An error occurred: {str(e)}")
            break

        count += 1
        if count % 3 != 0:
            continue

        frame = cv2.resize(frame, (640, 640))
        results = model.predict(frame, conf=0.05, iou=0.5, device=0)

        a = results[0].boxes.data
        px = pd.DataFrame(a.cpu().numpy()).astype("float")

        annotated_frame = results[0].plot()

        bounding_list = {
            'bicycle': [],
            'bus': [],
            'car': [],
            'e_bike': [],
            'jeep': [],
            'motorcycle': [],
            'tricycle': [],
            'truck': [],
            'van': []
        }

        for index, row in px.iterrows():
            x1 = int(row[0])
            y1 = int(row[1])
            x2 = int(row[2])
            y2 = int(row[3])
            d = int(row[5])
            c = class_list[d]

            if 'bicycle' in c:
                bounding_list['bicycle'].append([x1, y1, x2, y2])
            elif 'bus' in c:
                bounding_list['bus'].append([x1, y1, x2, y2])
            elif 'car' in c:
                bounding_list['car'].append([x1, y1, x2, y2])
            elif 'e-bike' in c:
                bounding_list['e_bike'].append([x1, y1, x2, y2])
            elif 'jeep' in c:
                bounding_list['jeep'].append([x1, y1, x2, y2])
            elif 'motorcycle' in c:
                bounding_list['motorcycle'].append([x1, y1, x2, y2])
            elif 'tricycle' in c:
                bounding_list['tricycle'].append([x1, y1, x2, y2])
            elif 'truck' in c:
                bounding_list['truck'].append([x1, y1, x2, y2])
            elif 'van' in c:
                bounding_list['van'].append([x1, y1, x2, y2])

        bbox_idx = {k: bicycle.update(v) if k == 'bicycle' else
                    bus.update(v) if k == 'bus' else
                    car.update(v) if k == 'car' else
                    e_bike.update(v) if k == 'e_bike' else
                    jeep.update(v) if k == 'jeep' else
                    motorcycle.update(v) if k == 'motorcycle' else
                    tricycle.update(v) if k == 'tricycle' else
                    truck.update(v) if k == 'truck' else
                    van.update(v) for k, v in bounding_list.items()}

        for k, v in bbox_idx.items():
            annotated_frame, _ = process_bbox(area1, annotated_frame, v, left_lane_counts[k])
            annotated_frame, _ = process_bbox(area2, annotated_frame, v, right_lane_counts[k])

   
        total_count = sum([len(v) for k, v in left_lane_counts.items()]) + sum([len(v) for k, v in right_lane_counts.items()])
        
        current_time = datetime.now()
        adjusted_time = current_time - timedelta(hours=9)
        utc_plus_8_time = adjusted_time + timedelta(hours=8)
        formatted_date = utc_plus_8_time.strftime('%B %d, %Y at %I:%M:%S %p UTC+8')
        
        vehicle_data3 = {
            "Quantity": total_count,
            "Datetime": formatted_date
        }
        historical_data1 = vehicle_data3
        
        cv2.polylines(annotated_frame, [np.array(area1, np.int32)], True, (255, 255, 0), 3)
        cv2.polylines(annotated_frame, [np.array(area2, np.int32)], True, (255, 255, 0), 3)

        for i, (key, value) in enumerate(left_lane_counts.items()):
            cvzone.putTextRect(annotated_frame, f'Left {key.capitalize()} Count: {len(value)}', (50, 30 + 30 * i),
                               font_scale, 2)
        for i, (key, value) in enumerate(right_lane_counts.items()):
            cvzone.putTextRect(annotated_frame, f'Right {key.capitalize()} Count: {len(value)}', (450, 30 + 30 * i),
                               font_scale, 2)
            
        # Send historical data every 10 seconds  
        if current_time.second % 10 == 0:
            set_historical_vehicle_counts('Historical Data', historical_data1)
            
        cv2.imshow("BSU-RTIVCS", annotated_frame)
        frame_queue.put(annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    out.release()
    frame_queue.put(None)
    save_thread.join()
    cv2.destroyAllWindows()


def main():
    stream_path = "test.MP4"
    class_path = 'classes.txt'
    model = YOLO('bests.pt')

    trackers = [Object_Tracker() for _ in range(9)]

    current_date = datetime.now().strftime("%Y-%m-%d")
    current_time = time.strftime("%H-%M-%S")
    output_file_name = f"BSU-RTIVCS-{current_time}-{current_date}.mp4"

    video_thread = threading.Thread(target=process_video, args=(
        stream_path, class_path, model, *trackers, output_file_name))
    video_thread.start()


if __name__ == "__main__":
    main()