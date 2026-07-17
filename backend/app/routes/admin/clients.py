"""Client Management Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid
import secrets
import string

from ...config.database import db
from ...models import Client, ClientCreate, User
from ...middleware.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/clients", tags=["Clients"])


def generate_password(length=10):
    """Generate a random password"""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


@router.get("", response_model=List[Client])
async def get_clients(current_user: User = Depends(get_current_user)):
    """Get all clients"""
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    return clients


@router.post("", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    """Create a new client and auto-create corporate admin user"""
    # Check for duplicate email
    existing = await db.clients.find_one({"email": client_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Client with this email already exists")
    
    client = Client(**client_data.model_dump())
    await db.clients.insert_one(client.model_dump())
    
    # Auto-create corporate admin user
    temp_password = generate_password()
    corporate_user = {
        "id": str(uuid.uuid4()),
        "email": client_data.email,
        "name": client_data.contact_person,
        "display_name": client_data.contact_person,
        "client_id": client.id,
        "role": "ADMIN",
        "department": "Management",
        "password_hash": get_password_hash(temp_password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.corporate_users.insert_one(corporate_user)
    
    # Return client with corporate credentials
    response = client.model_dump()
    response["corporate_login"] = {
        "email": client_data.email,
        "password": temp_password,
        "note": "Please save this password. It can be changed after first login."
    }
    
    return response


@router.get("/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific client"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return Client(**client)


@router.put("/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    """Update a client"""
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_data.model_dump()
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return Client(**updated)


@router.delete("/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_user)):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}
