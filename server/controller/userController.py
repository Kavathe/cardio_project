from flask import request, jsonify
from model.userModel import UserModel, bcrypt

def register_controller():
    try:
        data = request.get_json()
        email = data.get("email", "").strip()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        user_type = data.get("type", "patient").strip()
        license_number = data.get("licenseNumber", "").strip()

        if not email or not username or not password:
            return jsonify({"message": "Missing required fields"}), 400

        # Validate user type
        if user_type not in ["doctor", "patient"]:
            return jsonify({"message": "Invalid user type"}), 400
            
        # Check if license number is provided for doctors
        if user_type == "doctor" and not license_number:
            return jsonify({"message": "License number is required for doctors"}), 400

        # Check if user with this email already exists
        existing_user = UserModel.find_user_by_email(email)  # Fixed function call
        if existing_user:
            return jsonify({"message": "Email already in use"}), 409
        
        # If all checks pass, create the new user
        result, status_code = UserModel.create_user(email, username, password, user_type, license_number)
        return jsonify(result), status_code

    except Exception as e:
        return jsonify({"message": "Registration failed: " + str(e)}), 500

 
def login_controller():
    try:
        data = request.get_json()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"error": "Missing required fields"}), 400

        # Fetch user by email
        user = UserModel.find_user_by_email(email)
        if not user:
            return jsonify({"error": "User does not exist"}), 404

      

        # Check if password is correct
        if not bcrypt.check_password_hash(user["password"], password):
            print("Password mismatch!")  # Debugging
            return jsonify({"error": "Invalid email or password"}), 401

        # Create a user object to send back (including user type)
        user_response = {
            "message": "Login successful", 
            "user_id": user["id"],
            "type": user["type"],
            "username": user["username"],
            "email": user["email"],
            "numeric_id": user.get("user_id")
        }
        
        return jsonify(user_response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_user_by_id_controller(user_id):
    try:
        # Check if the id is valid
        from bson.objectid import ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({"error": "Invalid user ID format"}), 400

        # Use the model method to find user
        user = UserModel.find_user_by_id(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Return only necessary data (exclude password)
        user_data = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "type": user["type"],
            "numeric_id": user.get("user_id")
        }
        
        # Include license number for doctors
        if user["type"] == "doctor" and "licenseNumber" in user:
            user_data["licenseNumber"] = user["licenseNumber"]
     
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_user_by_email_controller():
    try:
        data = request.get_json()
        email = data.get("email", "").strip()

        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Find user by email
        user = UserModel.find_user_by_email(email)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Return only necessary data (exclude password)
        user_data = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "type": user["type"],
            "numeric_id": user.get("user_id")
        }
        
        # Include license number for doctors
        if user["type"] == "doctor" and "licenseNumber" in user:
            user_data["licenseNumber"] = user["licenseNumber"]
     
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_user_by_numeric_id_controller(numeric_id):
    try:
        # Convert to integer
        try:
            numeric_id = int(numeric_id)
        except ValueError:
            return jsonify({"error": "Invalid numeric ID format"}), 400

        # Use the model method to find user
        user = UserModel.find_user_by_numeric_id(numeric_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Return only necessary data (exclude password)
        user_data = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "type": user["type"],
            "numeric_id": user.get("user_id")
        }
        
        # Include license number for doctors
        if user["type"] == "doctor" and "licenseNumber" in user:
            user_data["licenseNumber"] = user["licenseNumber"]
     
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_patients_for_autocomplete_controller():
    try:
        # Get search term from query params
        search_term = request.args.get('search', '').strip()
        
        # Get limit parameter (default to 5)
        try:
            limit = int(request.args.get('limit', 5))
        except ValueError:
            limit = 5
            
        # Get patients matching search term
        patients = UserModel.find_patients_by_username(search_term, limit)
        
        # Format data for response
        patients_data = []
        for patient in patients:
            patients_data.append({
                "id": patient.get("id"),
                "username": patient.get("username"),
                "email": patient.get("email"),
                "numeric_id": patient.get("user_id")
            })
        
        return jsonify({"patients": patients_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500