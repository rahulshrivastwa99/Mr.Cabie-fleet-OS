"""Database configuration and connection"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio

class DatabaseProxy:
    def __init__(self):
        self._client = None
        self._db = None
        self._saved_loop = None

    def _get_db(self):
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            # Use connect=False to prevent connection hangs during construction
            current_loop = None

        # Recreate client if the event loop has changed or is closed
        if self._client is not None:
            if current_loop is not None and self._saved_loop != current_loop:
                self._client = None
                self._db = None
            elif current_loop is not None and current_loop.is_closed():
                self._client = None
                self._db = None

        if self._client is None:
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
            db_name = os.environ.get('DB_NAME', 'fleet_os')
            self._client = AsyncIOMotorClient(mongo_url, connect=False )
            self._db = self._client[db_name]
            self._saved_loop = current_loop
            
        return self._db

    def __getattr__(self, name):
        return getattr(self._get_db(), name)

    def __getitem__(self, name):
        return self._get_db()[name]


db = DatabaseProxy()

# Collections (These are maintained as properties/proxies for legacy code compatibility)
users_collection = db.users
drivers_collection = db.drivers
vehicles_collection = db.vehicles
clients_collection = db.clients
contracts_collection = db.contracts
trips_collection = db.duties  # Legacy name maintained
duty_slips_collection = db.duty_slips
invoices_collection = db.invoices
bookings_collection = db.bookings
employees_collection = db.employees
corporate_users_collection = db.corporate_users
driver_locations_collection = db.driver_locations
driver_otps_collection = db.driver_otps
services_collection = db.services
pricing_rules_collection = db.pricing_rules
additional_charges_collection = db.additional_charges
rate_cards_collection = db.rate_cards
settings_collection = db.settings
