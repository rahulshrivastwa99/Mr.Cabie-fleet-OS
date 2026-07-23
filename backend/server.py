"""
Mr. Cabie Fleet OS - Main Application Entry Point (Refactored)

This is the new modular server structure. The original monolithic server.py 
has been split into:
- /app/config/     - Database and settings
- /app/models/     - Pydantic models and enums
- /app/routes/     - API route handlers (admin, corporate, driver)
- /app/middleware/ - Authentication and authorization
- /app/services/   - Business logic (OTP, PDF extraction, pricing)

To use this refactored version, rename this file to server.py
"""
import sys
import os

# Auto-re-execute using virtual environment (venv) if run globally
if sys.prefix == sys.base_prefix:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python_win = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    venv_python_unix = os.path.join(base_dir, "venv", "bin", "python")
    venv_python = venv_python_win if os.path.exists(venv_python_win) else venv_python_unix
    if os.path.exists(venv_python):
        os.execv(venv_python, [venv_python] + sys.argv)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the API router
from app.routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events"""
    # Startup
    print("Mr. Cabie Fleet OS API starting...")
    
    # Initialize admin user if not exists
    from app.config.database import db
    from app.middleware.auth import get_password_hash
    
    admin = await db.users.find_one({"email": "admin@fleetOS.com"})
    if not admin:
        from datetime import datetime, timezone
        import uuid
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "admin@fleetOS.com",
            "name": "Admin User",
            "role": "admin",
            "password_hash": get_password_hash("password123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print("Default admin user created")
    
    print("Fleet OS API ready")
    
    yield
    
    # Shutdown
    print("Fleet OS API shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Mr. Cabie Fleet OS API",
    description="Enterprise Fleet Management System",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API router
app.include_router(api_router, prefix="/api")

# Ensure uploads directory exists and expose under /api/uploads so K8s ingress routes it to backend
UPLOAD_DIR = Path("/app/backend/uploads")
(UPLOAD_DIR / "duty_photos").mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/")
async def root():
    return {
        "service": "Mr. Cabie Fleet OS API",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
