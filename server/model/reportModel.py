# from extension import mongo  # Import initialized mongo
# from bson import ObjectId

# class PatientModel:
#     @staticmethod
#     def create_patients(patients):
#         """Create multiple patient records"""
#         if mongo.db is None:
#             raise Exception("MongoDB is not initialized!")

#         # Convert input patient list into the correct format
#         formatted_patients = [
#             {
#                 "patient_name": patient["patient_name"],
#                 "doctor_name": patient["doctor_name"],
#                 "heart_class": patient["heart_class"],
#                 "date": patient["date"],
#                 "status": patient.get("status", "Pending")  # Default: 'Pending'
#             }
#             for patient in patients
#         ]

#         inserted = mongo.db.patients.insert_many(formatted_patients)
#         return {"message": "Patients added successfully", "patient_ids": [str(id) for id in inserted.inserted_ids]}, 201

#     @staticmethod
#     def find_patient_by_id(patient_id):
#         """Find a patient by Object ID"""
#         if mongo.db is None:
#             raise Exception("MongoDB is not initialized!")

#         patient = mongo.db.patients.find_one({"_id": ObjectId(patient_id)})
#         if not patient:
#             return None
        
#         return {
#             "id": str(patient["_id"]),
#             "patient_name": patient["patient_name"],
#             "doctor_name": patient["doctor_name"],
#             "heart_class": patient["heart_class"],
#             "date": patient["date"],
#             "status": patient["status"]
#         }

#     @staticmethod
#     def update_patient_status(patient_id, new_status):
#         """Update patient status"""
#         if mongo.db is None:
#             raise Exception("MongoDB is not initialized!")

#         result = mongo.db.patients.update_one(
#             {"_id": ObjectId(patient_id)},
#             {"$set": {"status": new_status}}
#         )

#         if result.modified_count:
#             return {"message": "Status updated successfully"}, 200
#         return {"error": "Patient not found or status unchanged"}, 404

#     @staticmethod
#     def get_all_patients():
#         """Retrieve all patient records"""
#         if mongo.db is None:
#             raise Exception("MongoDB is not initialized!")

#         patients = mongo.db.patients.find()
#         return [
#             {
#                 "id": str(patient["_id"]),
#                 "patient_name": patient["patient_name"],
#                 "doctor_name": patient["doctor_name"],
#                 "heart_class": patient["heart_class"],
#                 "date": patient["date"],
#                 "status": patient["status"]
#             }
#             for patient in patients
#         ]



from datetime import datetime
from uuid import uuid4
from typing import Dict, List, Optional, Any, Union
from pymongo import MongoClient
from bson.objectid import ObjectId

class PatientModel:
    """
    Model representing a patient's report in the HeartCare system.
    Handles data validation and storage using MongoDB.
    """
    
    # MongoDB connection
    client = MongoClient('mongodb://localhost:27017/heartdisease')
    db = client['heartdisease']
    patients_collection = db['patients']
    
    def __init__(self, patient_data: Dict[str, Any]):
        """Initialize a new patient record"""
        self.id = str(uuid4())
        self.patientId = patient_data.get('patientId', '')
        self.patientName = patient_data.get('patientName', '')
        self.doctorName = patient_data.get('doctorName', '')
        self.heartClass = patient_data.get('heartClass', 'N')
        self.description = patient_data.get('description', '')
        self.date = patient_data.get('date', datetime.now().strftime('%Y-%m-%d'))
        self.status = patient_data.get('status', 'pending')
        self.result = patient_data.get('result', '')
        
        # Validate heart class
        if self.heartClass not in ['L', 'N', 'R', 'V']:
            self.heartClass = 'N'  # Default to Normal if invalid
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert patient object to dictionary"""
        return {
            'id': self.id,
            'patientId': self.patientId,
            'patientName': self.patientName,
            'doctorName': self.doctorName,
            'heartClass': self.heartClass,
            'description': self.description,
            'date': self.date,
            'status': self.status,
            'result': self.result
        }
    
    @classmethod
    def save(cls, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create and save a new patient record"""
        patient = PatientModel(patient_data)
        patient_dict = patient.to_dict()
        
        # Insert into MongoDB
        result = cls.patients_collection.insert_one(patient_dict)
        
        # Ensure the MongoDB _id is not in the response
        patient_dict.pop('_id', None)
        
        return patient_dict
    
    @classmethod
    def get_all(cls) -> List[Dict[str, Any]]:
        """Retrieve all patient records"""
        patients = list(cls.patients_collection.find())
        
        # Convert MongoDB _id to string for JSON serialization
        for patient in patients:
            if '_id' in patient:
                patient['_id'] = str(patient['_id'])
        
        return patients
    
    @classmethod
    def get_by_id(cls, patient_id: str) -> Optional[Dict[str, Any]]:
        """Find a patient by their ID"""
        patient = cls.patients_collection.find_one({'patientId': patient_id})
        
        if patient:
            # Convert MongoDB _id to string for JSON serialization
            if '_id' in patient:
                patient['_id'] = str(patient['_id'])
            return patient
        
        return None
    
    @classmethod
    def update(cls, patient_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing patient record by patientId"""
        # Ensure _id is not in the update data
        update_data.pop('_id', None)
        
        # Update in MongoDB
        result = cls.patients_collection.update_one(
            {'patientId': patient_id},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            # Get the updated patient
            updated_patient = cls.get_by_id(patient_id)
            return updated_patient
        
        return None
    
    @classmethod
    def update_status(cls, patient_id: str, status: str) -> Optional[Dict[str, Any]]:
        """Update only the status of a patient"""
        if status not in ['pending', 'completed']:
            raise ValueError("Status must be either 'pending' or 'completed'")
        
        # Update in MongoDB
        result = cls.patients_collection.update_one(
            {'patientId': patient_id},
            {'$set': {'status': status}}
        )
        
        if result.modified_count > 0:
            # Get the updated patient
            updated_patient = cls.get_by_id(patient_id)
            return updated_patient
        
        return None

    @classmethod
    def get_by_user_id(cls, user_id: Union[str, int]) -> List[Dict[str, Any]]:
        """Find all reports for a specific user ID"""
        # Convert user_id to string if it's not already
        user_id_str = str(user_id)
        
        # Find all reports where the patientId matches the user_id
        reports = list(cls.patients_collection.find({'patientId': user_id_str}))
        
        # Convert MongoDB _id to string for JSON serialization
        for report in reports:
            if '_id' in report:
                report['_id'] = str(report['_id'])
        
        return reports

    @classmethod
    def get_by_mongodb_id(cls, report_id: str) -> Optional[Dict[str, Any]]:
        """Find a report by its MongoDB _id (as a string)"""
        try:
            # Try to convert the string ID to ObjectId
            from bson.objectid import ObjectId
            obj_id = ObjectId(report_id)
            
            # Query using MongoDB _id
            report = cls.patients_collection.find_one({'_id': obj_id})
            
            if report:
                # Convert MongoDB _id to string for JSON serialization
                report['_id'] = str(report['_id'])
                return report
            
            return None
        except Exception:
            # If conversion fails or other error, return None
            return None
    
    @classmethod
    def update_status_by_id(cls, report_id: str, status: str) -> Optional[Dict[str, Any]]:
        """Update the status of a report by its unique ID (either UUID or MongoDB _id)"""
        if status not in ['pending', 'completed']:
            raise ValueError("Status must be either 'pending' or 'completed'")
        
        # First try to treat report_id as MongoDB ObjectId
        try:
            from bson.objectid import ObjectId
            # Check if report_id is a valid ObjectId format
            if len(report_id) == 24 and all(c in '0123456789abcdefABCDEF' for c in report_id):
                obj_id = ObjectId(report_id)
                
                # Update in MongoDB by _id
                result = cls.patients_collection.update_one(
                    {'_id': obj_id},
                    {'$set': {'status': status}}
                )
                
                if result.modified_count > 0:
                    # Get the updated report
                    updated_report = cls.patients_collection.find_one({'_id': obj_id})
                    if updated_report:
                        # Convert MongoDB _id to string for JSON serialization
                        updated_report['_id'] = str(updated_report['_id'])
                        return updated_report
        except Exception:
            # If conversion fails, continue with UUID approach
            pass
        
        # Try using report_id as the 'id' field (UUID)
        result = cls.patients_collection.update_one(
            {'id': report_id},
            {'$set': {'status': status}}
        )
        
        if result.modified_count > 0:
            # Get the updated report
            updated_report = cls.patients_collection.find_one({'id': report_id})
            if updated_report and '_id' in updated_report:
                # Convert MongoDB _id to string for JSON serialization
                updated_report['_id'] = str(updated_report['_id'])
            return updated_report
        
        # If no update happened with either approach, fall back to patientId for backwards compatibility
        result = cls.patients_collection.update_one(
            {'patientId': report_id},
            {'$set': {'status': status}}
        )
        
        if result.modified_count > 0:
            # Get the updated report
            updated_report = cls.patients_collection.find_one({'patientId': report_id})
            if updated_report and '_id' in updated_report:
                # Convert MongoDB _id to string for JSON serialization
                updated_report['_id'] = str(updated_report['_id'])
            return updated_report
            
        return None

    @classmethod
    def update_by_mongodb_id(cls, mongodb_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing patient record by MongoDB _id"""
        try:
            # Ensure _id is not in the update data
            update_data.pop('_id', None)
            
            # Convert string ID to ObjectId
            from bson.objectid import ObjectId
            obj_id = ObjectId(mongodb_id)
            
            # Update in MongoDB by _id
            result = cls.patients_collection.update_one(
                {'_id': obj_id},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                # Get the updated report
                updated_report = cls.patients_collection.find_one({'_id': obj_id})
                if updated_report:
                    # Convert MongoDB _id to string for JSON serialization
                    updated_report['_id'] = str(updated_report['_id'])
                    return updated_report
            return None
        except Exception as e:
            print(f"Error updating by MongoDB ID: {e}")
            return None
            
    @classmethod
    def update_by_uuid(cls, uuid_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing patient record by UUID id field"""
        try:
            # Ensure _id is not in the update data
            update_data.pop('_id', None)
            
            # Update in MongoDB by UUID id field
            result = cls.patients_collection.update_one(
                {'id': uuid_id},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                # Get the updated report
                updated_report = cls.patients_collection.find_one({'id': uuid_id})
                if updated_report and '_id' in updated_report:
                    # Convert MongoDB _id to string for JSON serialization
                    updated_report['_id'] = str(updated_report['_id'])
                return updated_report
            return None
        except Exception as e:
            print(f"Error updating by UUID: {e}")
            return None