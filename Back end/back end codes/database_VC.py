import pyrebase
import firebase_admin
from firebase_admin import credentials, firestore

# Firebase configuration
firebaseConfig = {
    'apiKey': "",
    'authDomain': "",
    'databaseURL': "",
    'projectId': "",
    'storageBucket': "",
    'messagingSenderId': "",
    'appId': "",
}

# Initialize Firebase Admin SDK
cred = credentials.Certificate("")
firebase_admin.initialize_app(cred, {
    'databaseURL': ""
})

# Initialize Pyrebase
firebase = pyrebase.initialize_app(firebaseConfig)

def set_historical_vehicle_counts(collection_name, historical_data):
    """
    Set historical vehicle counts in the Firestore database.

    Args:
    - collection_name (str): Name of the collection in Firestore.
    - historical_data (dict): Dictionary containing historical vehicle counts.

    Returns:
    - None
    """
    db = firestore.client()
    current_time = firestore.SERVER_TIMESTAMP

    for key, value in historical_data.items():
        doc_ref = db.collection(collection_name).document()
        doc_ref.set({
            "Vehicle_Type": key,
            "Historical_Count": value,
            "Timestamp": current_time
        })

    print("Historical data updated successfully!")

def set_vehicle_counts(node_name, vehicle_data):
    """
    Set real-time vehicle counts data to Firebase Realtime Database.

    Args:
    - node_name (str): Node name in the Firebase Realtime Database.
    - vehicle_data (dict): Dictionary containing real-time counts of various vehicle types.

    Returns:
    - None
    """
    db = firebase.database()
    db.child("Image Processing").child(node_name).set(vehicle_data)

def send_data_to_firebase(process, data):
    """
    Send data to Firestore under a specified collection.

    Args:
    - process (str): The collection name in Firestore.
    - data (dict): Data to be sent to Firestore.

    Returns:
    - None
    """
    db = firestore.client()
    doc_ref = db.collection(process).document('lane_data')
    doc_ref.set(data)
    print(f"Data sent to Firebase for {process}: {data}")

def set_historical_vehicle_counts(node_name, vehicle_data):
    """
    Push historical vehicle counts data to Firebase Realtime Database.

    Args:
    - node_name (str): Node name in the Firebase Realtime Database.
    - vehicle_data (dict): Dictionary containing historical counts of various vehicle types.

    Returns:
    - None
    """
    db = firebase.database()
    db.child("Image Processing").child(node_name).push(vehicle_data)
