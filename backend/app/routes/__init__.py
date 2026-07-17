"""Routes package - exports all routers"""
from fastapi import APIRouter
from .admin import router as admin_router
from .driver import router as driver_router
from .corporate import router as corporate_router

api_router = APIRouter()

# Include all route modules
api_router.include_router(admin_router)
api_router.include_router(driver_router)
api_router.include_router(corporate_router)
