# from flask import request, jsonify
# from bson import ObjectId
# from extension import mongo
# from model.reportModel import PatientModel

# # ✅ Controller: Add Patient Data (Handles Single & Bulk Insert)
# def add_patient_controller():
#     try:
#         data = request.get_json()

#         if "patients" not in data or not isinstance(data["patients"], list):
#             return jsonify({"error": "Invalid input format. Expected 'patients' as a list."}), 400

#         patients_list = []
#         for patient in data["patients"]:
#             patient_obj = PatientModel(**patient)
#             patients_list.append(patient_obj.__dict__)

#         inserted_ids = mongo.db.patients.insert_many(patients_list).inserted_ids

#         return jsonify({
#             "message": "Patients added successfully",
#             "patient_ids": [str(id) for id in inserted_ids]
#         }), 201
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# # ✅ Controller: Get All Patients
# def get_all_patients_controller():
#     try:
#         patients = list(mongo.db.patients.find({}))
#         return jsonify({
#             "patients": [PatientModel(**patient).to_json() for patient in patients]
#         }), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# # ✅ Controller: Get Patient by ID
# def get_patient_controller(patient_id):
#     try:
#         patient = mongo.db.patients.find_one({"_id": ObjectId(patient_id)})
#         if not patient:
#             return jsonify({"error": "Patient not found"}), 404

#         return jsonify(PatientModel(**patient).to_json()), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# # ✅ Controller: Update Patient Status
# def update_patient_status_controller(patient_id):
#     try:
#         data = request.get_json()
#         new_status = data.get("status")

#         if not new_status:
#             return jsonify({"error": "Missing 'status' field"}), 400

#         updated = mongo.db.patients.update_one(
#             {"_id": ObjectId(patient_id)},
#             {"$set": {"status": new_status}}
#         )

#         if updated.modified_count == 0:
#             return jsonify({"error": "Patient not found or status unchanged"}), 404

#         return jsonify({"message": "Patient status updated successfully"}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# # ✅ Controller: Edit Patient Details
# def edit_patient_controller(patient_id):
#     try:
#         data = request.get_json()
#         update_data = {key: data[key] for key in PatientModel.__annotations__.keys() if key in data}

#         if not update_data:
#             return jsonify({"error": "No data provided for update"}), 400

#         updated = mongo.db.patients.update_one(
#             {"_id": ObjectId(patient_id)},
#             {"$set": update_data}
#         )

#         if updated.modified_count == 0:
#             return jsonify({"error": "Patient not found or data unchanged"}), 404

#         return jsonify({"message": "Patient details updated successfully"}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500



from flask import request, jsonify
from model.reportModel import PatientModel
from typing import Dict, Any, Tuple, Union

def add_patient_controller() -> Tuple[Dict[str, Any], int]:
    """
    Controller function to add a new patient record.
    Corresponds to POST /api/v1/patients
    """
    try:
        # Get data from request
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patientId', 'patientName', 'heartClass']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Remove check for existing patient to allow multiple reports per patient
        # Each report will have the same patientId but a unique _id in MongoDB
        
        # Save patient data
        new_patient = PatientModel.save(data)
        
        return jsonify(new_patient), 201
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error adding patient: {str(e)}'
        }), 500

def get_all_patients_controller() -> Tuple[Dict[str, Any], int]:
    """
    Controller function to get all patient records.
    Corresponds to GET /api/v1/patients
    """
    try:
        patients = PatientModel.get_all()
        
        # If no patients found, return an empty array (not an error)
        if not patients:
            return jsonify([]), 200
        
        return jsonify(patients), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving patients: {str(e)}'
        }), 500

def get_patient_controller(patient_id: str) -> Tuple[Dict[str, Any], int]:
    """
    Controller function to get a specific patient record by ID.
    Corresponds to GET /api/v1/patients/<patient_id>
    """
    try:
        patient = PatientModel.get_by_id(patient_id)
        
        if not patient:
            return jsonify({
                'success': False,
                'message': f'Patient with ID {patient_id} not found'
            }), 404
        
        return jsonify(patient), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving patient: {str(e)}'
        }), 500

def update_patient_status_controller(patient_id: str) -> Tuple[Dict[str, Any], int]:
    """
    Controller function to update a patient's status.
    Corresponds to PUT /api/v1/patients/<patient_id>/status
    """
    try:
        data = request.get_json()
        
        if 'status' not in data:
            return jsonify({
                'success': False,
                'message': 'Status field is required'
            }), 400
        
        status = data['status']
        if status not in ['pending', 'completed']:
            return jsonify({
                'success': False,
                'message': "Status must be either 'pending' or 'completed'"
            }), 400
        
        # First try to find the report by its ID (which might be MongoDB ObjectId)
        patient = PatientModel.get_by_id(patient_id)
        
        if not patient:
            # If not found by ID, try to find by MongoDB's _id
            patient = PatientModel.get_by_mongodb_id(patient_id)
            
            if not patient:
                return jsonify({
                    'success': False,
                    'message': f'Report with ID {patient_id} not found'
                }), 404
        
        # Now we have the patient/report, update its status
        # Use MongoDB ID if available for more precise targeting
        report_id = patient.get('_id', patient_id)
        updated_patient = PatientModel.update_status_by_id(report_id, status)
        
        if not updated_patient:
            return jsonify({
                'success': False,
                'message': 'Failed to update report status'
            }), 500
        
        return jsonify(updated_patient), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating report status: {str(e)}'
        }), 500

def edit_patient_controller(patient_id: str) -> Tuple[Dict[str, Any], int]:
    """
    Controller function to update a patient's details.
    Corresponds to PUT /api/v1/patients/<patient_id>
    """
    try:
        data = request.get_json()
        
        # First try to find the report by patientId (original behavior)
        patient = PatientModel.get_by_id(patient_id)
        
        if not patient:
            # If not found by patientId, try to find by MongoDB's _id
            patient = PatientModel.get_by_mongodb_id(patient_id)
            
            # If still not found, try to find by UUID id field
            if not patient:
                all_reports = PatientModel.get_all()
                for report in all_reports:
                    if report.get('id') == patient_id:
                        patient = report
                        break
            
            if not patient:
                return jsonify({
                    'success': False,
                    'message': f'Report with ID {patient_id} not found'
                }), 404
        
        # Prevent changing patientId if present in the original report
        if 'patientId' in data and patient.get('patientId') and data['patientId'] != patient.get('patientId'):
            return jsonify({
                'success': False,
                'message': 'Cannot change patient ID'
            }), 400
        
        # Determine which ID to use for the update
        if patient.get('_id') == patient_id:
            # It's a MongoDB _id
            updated_patient = PatientModel.update_by_mongodb_id(patient_id, data)
        elif patient.get('id') == patient_id:
            # It's a UUID id
            updated_patient = PatientModel.update_by_uuid(patient_id, data)
        else:
            # Default to patientId
            updated_patient = PatientModel.update(patient.get('patientId'), data)
        
        if not updated_patient:
            return jsonify({
                'success': False,
                'message': 'Failed to update report'
            }), 500
        
        return jsonify(updated_patient), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating report: {str(e)}'
        }), 500

def get_patient_reports_by_user_id_controller(user_id: str):
    """
    Controller function to get all reports for a specific user by their numeric ID.
    Corresponds to GET /api/v1/patients/user/:user_id
    """
    try:
        # Convert the user_id to int if possible
        try:
            user_id_int = int(user_id)
        except ValueError:
            user_id_int = user_id
        
        # Get reports for the user
        reports = PatientModel.get_by_user_id(user_id_int)
        
        if not reports or len(reports) == 0:
            return jsonify({"message": "No reports found for this user", "reports": []}), 404
        
        return jsonify({"message": "Reports retrieved successfully", "reports": reports}), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving patient reports: {str(e)}'
        }), 500