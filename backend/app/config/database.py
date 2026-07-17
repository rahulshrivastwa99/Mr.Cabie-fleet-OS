"""Database configuration and connection"""
from motor.motor_asyncio import AsyncIOMotorClient
import os

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'fleet_os')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Collections
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
