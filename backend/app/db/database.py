"""MongoDB connection setup."""
from pymongo import MongoClient
from app.core.config import settings

# MongoDB client and database
_client = None
_db = None

def get_mongo_client():
    """Get MongoDB client."""
    global _client
    if _client is None:
        _client = MongoClient(settings.database_url)
    return _client

def get_database():
    """Get MongoDB database."""
    global _db
    if _db is None:
        client = get_mongo_client()
        _db = client['yelp']
    return _db

def get_db():
    """FastAPI dependency: returns MongoDB database."""
    return get_database()

# For backward compatibility
db = get_database()