"""Admin routes package"""
from fastapi import APIRouter
from .auth import router as auth_router
from .vehicles import router as vehicles_router
from .drivers import router as drivers_router
from .clients import router as clients_router
from .duties import router as duties_router
from .duty_slips import router as duty_slips_router
from .tracking import router as tracking_router
from .bookings import router as bookings_router
from .corporate_users import router as corporate_users_router
from .contracts import router as contracts_router
from .dashboard import router as dashboard_router
from .invoices import router as invoices_router

router = APIRouter()

# Include all admin routes
router.include_router(auth_router)
router.include_router(vehicles_router)
router.include_router(drivers_router)
router.include_router(clients_router)
router.include_router(duties_router)
router.include_router(duty_slips_router)
router.include_router(tracking_router)
router.include_router(bookings_router)
router.include_router(corporate_users_router)
router.include_router(contracts_router)
router.include_router(dashboard_router)
router.include_router(invoices_router)

# Note: Add more route imports here as they are created
# from .trips import router as trips_router
# from .contracts import router as contracts_router
# from .duty_slips import router as duty_slips_router
# from .invoices import router as invoices_router
# from .tracking import router as tracking_router
