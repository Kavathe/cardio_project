from flask import Flask, jsonify, request
from flask_cors import CORS  # ✅ Import CORS
import tensorflow as tf
import numpy as np
from flask import Blueprint
from controller.userController import (
    register_controller, 
    login_controller, 
    get_user_by_email_controller, 
    get_user_by_numeric_id_controller,
    get_patients_for_autocomplete_controller
)
from controller.patient_controller import (
    add_patient_controller,
    get_all_patients_controller,
    get_patient_controller,
    update_patient_status_controller,
    edit_patient_controller,
    get_patient_reports_by_user_id_controller
)
from extension import mongo, bcrypt 



app = Flask(__name__)

# Enable CORS for all origins
CORS(app)  # ✅ Allows requests from any domain

# MongoDB Configuration
app.config["MONGO_URI"] = "mongodb://localhost:27017/heartdisease"
mongo.init_app(app)  # ✅ Initialize Mongo
bcrypt.init_app(app)  # ✅ Initialize Bcrypt


if mongo.db is None:
    print("MongoDB connection failed!")  # Debugging log

# Verify connection
try:
    mongo.db.users.find_one()
    print("MongoDB Connected Successfully!")
except Exception as e:
    print(f"MongoDB connection error: {e}")


# Load ML Model
model = tf.keras.models.load_model('arrhythmia_detection_model1.h5')

# Class labels mapping
CLASS_LABELS = {
    0: '/', 
    1: 'L', 
    2: 'N', 
    3: 'R',  
    4: 'V'
}

@app.route('/')
def hello_world():
    return {"message": "Hello, World!"}



# Routes
@app.route("/api/v1/register", methods=["POST"])
def register():
    return register_controller()

@app.route("/api/v1/login", methods=["POST"])
def login():
    return login_controller()

# New route to get user by email
@app.route("/api/v1/users/email", methods=["POST"])
def get_user_by_email():
    return get_user_by_email_controller()

# New route to get user by numeric ID
@app.route("/api/v1/users/numeric/<numeric_id>", methods=["GET"])
def get_user_by_numeric_id(numeric_id):
    return get_user_by_numeric_id_controller(numeric_id)

# Patient autocomplete suggestions
@app.route("/api/v1/patients/autocomplete", methods=["GET"])
def get_patients_for_autocomplete():
    return get_patients_for_autocomplete_controller()

# ✅ Route 1: Store Patient Data (Doctor adds a report)
@app.route("/api/v1/patients", methods=["POST"])
def add_patient():
    return add_patient_controller()

# ✅ Route 2: Get All Patients (Doctor fetches all records)
@app.route("/api/v1/patients", methods=["GET"])
def get_all_patients():
    return get_all_patients_controller()

# Route 6: Get Patient Reports by User ID
@app.route("/api/v1/patients/user/<user_id>", methods=["GET"])
def get_patient_reports_by_user_id(user_id):
    return get_patient_reports_by_user_id_controller(user_id)

# ✅ Route 3: Get a Specific Patient by ID
@app.route("/api/v1/patients/<patient_id>", methods=["GET"])
def get_patient(patient_id):
    return get_patient_controller(patient_id)

# ✅ Route 4: Update Patient Status (Doctor marks report as Completed)
@app.route("/api/v1/patients/<patient_id>/status", methods=["PUT"])
def update_patient_status(patient_id):
    return update_patient_status_controller(patient_id)

# ✅ Route 5: Edit Patient Details (Doctor can update patient info)
@app.route("/api/v1/patients/<patient_id>", methods=["PUT"])
def edit_patient(patient_id):
    return edit_patient_controller(patient_id)

# New route to get user by ID
@app.route("/api/v1/users/<user_id>", methods=["GET"])
def get_user_by_id(user_id):
    from controller.userController import get_user_by_id_controller
    print(get_user_by_id_controller(user_id))
    return get_user_by_id_controller(user_id)


# Data Preprocessing
def preprocess_input(arrhythmia):
    expected_shape = (10, 20, 1)  
    actual_length = len(arrhythmia)

    if actual_length > 200:
        arrhythmia = arrhythmia[:200]  
    elif actual_length < 200:   
        arrhythmia = np.pad(arrhythmia, (0, 200 - actual_length), mode='constant')

    arrhythmia = np.array(arrhythmia).reshape(1, 10, 20, 1)  
    return arrhythmia

# Prediction Function
def predict(arrhythmia):
    arrhythmia = preprocess_input(arrhythmia)
    prediction = model.predict(arrhythmia)

    if prediction.shape[1] == 1:
        predicted_class = int(prediction[0][0] >= 0.5)  
    else:
        predicted_class = int(np.argmax(prediction))  
    
    return predicted_class

@app.route("/predict", methods=["POST"])
def predict_route():
    try:
        data = request.json
        if not data or "beatData" not in data:
            return jsonify({"error": "Invalid input. Expected 'beatData' key with a list of values."}), 400
        
        arrhythmia = data["beatData"]
        if not isinstance(arrhythmia, list) or not all(isinstance(i, (int, float)) for i in arrhythmia):
            return jsonify({"error": "Invalid data format. 'beatData' must be a list of numbers."}), 400
        
        print(f"Input data length: {len(arrhythmia)}")

        processed_data = preprocess_input(arrhythmia)
        print(f"Processed shape: {processed_data.shape}")

        predicted_class_idx = predict(arrhythmia)
        predicted_class_label = CLASS_LABELS.get(predicted_class_idx, "Unknown")

        return jsonify({
            "predicted_class_index": predicted_class_idx,
            "predicted_class_label": predicted_class_label,
            "status": "success"
        })

    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500

if __name__ == '__main__':
    app.run(debug=True)
