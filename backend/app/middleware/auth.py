"""Authentication middleware and utilities"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt

from ..config.settings import JWT_SECRET_KEY, JWT_ALGORITHM
from ..config.database import db
from ..models import User, CorporateUser

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated admin user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")


async def get_current_corporate_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CorporateUser:
    """Get current authenticated corporate user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("type")
        if user_id is None or user_type != "corporate":
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user = await db.corporate_users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return CorporateUser(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")


async def get_current_driver(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated driver from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        driver_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if driver_id is None or token_type != "driver":
            raise HTTPException(status_code=401, detail="Invalid authentication")
        driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
        if driver is None:
            raise HTTPException(status_code=401, detail="Driver not found")
        return driver
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")
