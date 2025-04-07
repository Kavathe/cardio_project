from extension import mongo, bcrypt   # Import initialized mongo & bcrypt
from bson import ObjectId
import uuid
import random

# User Model
class UserModel:
    @staticmethod
    def generate_user_id():
        """Generate a unique user ID"""
        # Get the highest user_id from the database
        highest_user = mongo.db.users.find_one(
            {"user_id": {"$exists": True}},
            sort=[("user_id", -1)]
        )
        
        # If no users with user_id exist, start from 1001
        if not highest_user or "user_id" not in highest_user:
            return 1001
        
        # Otherwise increment the highest user_id
        return highest_user["user_id"] + 1

    @staticmethod
    def create_user(email, username, password, type="patient", licenseNumber=None):
        """Create a new user with a hashed password"""
        if mongo.db is None:
            raise Exception("MongoDB is not initialized!")

        if mongo.db.users.find_one({"email": email}):
            return {"error": "User already exists"}, 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Generate a unique user_id
        user_id = UserModel.generate_user_id()

        user_data = {
            "email": email,
            "username": username,
            "password": hashed_password,
            "type": type,
            "user_id": user_id
        }
        
        # Add license number for doctors
        if type == "doctor" and licenseNumber:
            user_data["licenseNumber"] = licenseNumber

        inserted_id = mongo.db.users.insert_one(user_data).inserted_id

        return {"message": "User registered successfully", "user_id": str(inserted_id), "numeric_id": user_id}, 201

    @staticmethod
    def find_user_by_email(email):
        """Find a user by email"""
        if mongo.db is None:
            raise Exception("MongoDB is not initialized!")

        user = mongo.db.users.find_one({"email": email})
        if user:
            user_data = {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user["username"],
                "password": user["password"],
                "type": user.get("type", "patient"),  # Default to patient if not specified
                "user_id": user.get("user_id", None)  # Include the numeric user_id
            }
            
            # Add license number if user is a doctor
            if user.get("type") == "doctor" and "licenseNumber" in user:
                user_data["licenseNumber"] = user["licenseNumber"]
                
            return user_data
        return None

    @staticmethod
    def find_user_by_id(user_id):
        """Find a user by ID"""
        if mongo.db is None:
            raise Exception("MongoDB is not initialized!")

        try:
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user_data = {
                    "id": str(user["_id"]),
                    "email": user["email"],
                    "username": user["username"],
                    "password": user["password"],
                    "type": user.get("type", "patient"),  # Default to patient if not specified
                    "user_id": user.get("user_id", None)  # Include the numeric user_id
                }
                
                # Add license number if user is a doctor
                if user.get("type") == "doctor" and "licenseNumber" in user:
                    user_data["licenseNumber"] = user["licenseNumber"]
                    
                return user_data
            return None
        except Exception as e:
            print(f"Error finding user by ID: {e}")
            return None

    @staticmethod
    def find_user_by_numeric_id(numeric_id):
        """Find a user by numeric user_id"""
        if mongo.db is None:
            raise Exception("MongoDB is not initialized!")

        try:
            user = mongo.db.users.find_one({"user_id": numeric_id})
            if user:
                user_data = {
                    "id": str(user["_id"]),
                    "email": user["email"],
                    "username": user["username"],
                    "password": user["password"],
                    "type": user.get("type", "patient"),  # Default to patient if not specified
                    "user_id": user.get("user_id", None)  # Include the numeric user_id
                }
                
                # Add license number if user is a doctor
                if user.get("type") == "doctor" and "licenseNumber" in user:
                    user_data["licenseNumber"] = user["licenseNumber"]
                    
                return user_data
            return None
        except Exception as e:
            print(f"Error finding user by numeric ID: {e}")
            return None

    @staticmethod
    def find_patients_by_username(search_term, limit=5):
        """Find patients by username for autocomplete
        Args:
            search_term: The search term to match against usernames
            limit: Maximum number of results to return (default 5)
        Returns:
            List of matching patient users (without passwords)
        """
        if mongo.db is None:
            raise Exception("MongoDB is not initialized!")

        try:
            # Create a regex pattern for case-insensitive search
            pattern = {'$regex': f'.*{search_term}.*', '$options': 'i'}
            
            # Query for users with type 'patient' and username matching the pattern
            patients = list(mongo.db.users.find(
                {"type": "patient", "username": pattern},
                {"password": 0}  # Exclude password field
            ).limit(limit))
            
            # Convert ObjectId to string for each patient
            for patient in patients:
                patient["id"] = str(patient["_id"])
                del patient["_id"]
                
            return patients
        except Exception as e:
            print(f"Error finding patients by username: {e}")
            return []
