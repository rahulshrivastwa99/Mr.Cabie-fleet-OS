"""Admin routes package"""
from fastapi import APIRouter
from .auth import router as auth_router
from .vehicles import router as vehicles_router
from .drivers import router as drivers_router
from .clients import router as clients_router

router = APIRouter()

# Include all admin routes
router.include_router(auth_router)
router.include_router(vehicles_router)
router.include_router(drivers_router)
router.include_router(clients_router)

# Note: Add more route imports here as they are created
# from .trips import router as trips_router
# from .contracts import router as contracts_router
# from .duty_slips import router as duty_slips_router
# from .invoices import router as invoices_router
# from .tracking import router as tracking_router
