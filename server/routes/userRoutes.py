from flask import Blueprint, request, jsonify
from ..controller.userController import register_controller, login_controller  # Import controllers

user_blueprint = Blueprint("users", __name__)

@user_blueprint.route("/register", methods=["POST"])
def register():
    return register_controller(request)

@user_blueprint.route("/login", methods=["POST"])
def login():
    return login_controller(request)
