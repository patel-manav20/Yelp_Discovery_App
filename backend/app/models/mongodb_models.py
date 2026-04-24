"""MongoDB data models using Pydantic."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import uuid4

class User(BaseModel):
    """User model for MongoDB."""
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    email: str
    username: str
    password_hash: str
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class Restaurant(BaseModel):
    """Restaurant model for MongoDB."""
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    name: str
    address: str
    owner_id: Optional[str] = None
    rating: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class Review(BaseModel):
    """Review model for MongoDB."""
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    restaurant_id: str
    user_id: str
    rating: int
    title: str
    text: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class Session(BaseModel):
    """Session model with TTL for MongoDB."""
    id: str = Field(default_factory=lambda: str(uuid4()), alias="_id")
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True