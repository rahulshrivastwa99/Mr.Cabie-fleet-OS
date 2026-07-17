"""Corporate routes package"""
from fastapi import APIRouter
from .auth import router as auth_router
from .dashboard import router as dashboard_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(dashboard_router)

# Add more corporate routes here
# from .bookings import router as bookings_router
# from .employees import router as employees_router
# from .invoices import router as invoices_router
