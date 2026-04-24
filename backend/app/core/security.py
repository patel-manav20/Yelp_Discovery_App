"""Password hashing and JWT utilities."""
import bcrypt
import jwt
from datetime import datetime, timedelta
from app.core.config import settings

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
    """Create JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.access_token_expire_minutes // 60)
    
    expire = datetime.utcnow() + expires_delta
    payload = {"user_id": user_id, "exp": expire}
    
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.InvalidTokenError:
        return None