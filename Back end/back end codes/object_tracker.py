import math


class Object_Tracker:
    """
    A class for tracking objects based on their bounding boxes' center points.

    Attributes:
        center_points (dict): A dictionary containing the center points of tracked objects.
        id_count (int): The count of unique object IDs.

    Methods: update(objects_rect): Update the object tracker with new bounding boxes and return the tracked objects'
    bounding boxes and IDs.
    """

    def __init__(self):
        """
        Initializes the Object_Tracker class.

        Attributes:
            center_points (dict): A dictionary to store center points of tracked objects.
            id_count (int): A counter to assign unique IDs to tracked objects.
        """
        self.center_points = {}
        self.id_count = 0

    def update(self, objects_rect):
        """
        Update the object tracker with new bounding boxes.

        Args:
            objects_rect (list): List of bounding boxes in the format (x, y, w, h) representing detected objects.

        Returns:
            list: A list of bounding boxes and IDs for the tracked objects.
        """
        objects_bbs_ids = []

        for rect in objects_rect:
            x, y, w, h = rect
            cx = (x + x + w) // 2
            cy = (y + y + h) // 2

            object_detected = False
            for obj_id, pt in self.center_points.items():
                dist = math.hypot(cx - pt[0], cy - pt[1])

                if dist < 35:
                    self.center_points[obj_id] = (cx, cy)
                    objects_bbs_ids.append([x, y, w, h, obj_id])
                    object_detected = True
                    break

            if not object_detected:
                self.center_points[self.id_count] = (cx, cy)
                objects_bbs_ids.append([x, y, w, h, self.id_count])
                self.id_count += 1

        new_center_points = {}
        for obj_bb_id in objects_bbs_ids:
            _, _, _, _, object_id = obj_bb_id
            center = self.center_points[object_id]
            new_center_points[object_id] = center

        self.center_points = new_center_points.copy()
        return objects_bbs_ids
