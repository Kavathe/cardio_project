from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt

# Initialize MongoDB and Bcrypt globally
mongo = PyMongo()
bcrypt = Bcrypt()
