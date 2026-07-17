"""Pricing calculation service"""
from typing import Optional, List
from ..config.database import db
from ..models import Contract


async def calculate_trip_cost(
    contract_id: str,
    vehicle_type: str,
    total_km: float,
    total_hours: float = 0,
    is_outstation: bool = False
) -> dict:
    """
    Calculate trip cost based on contract rates
    Returns: {base_fare, extra_km_charge, extra_hour_charge, total}
    """
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        return {"error": "Contract not found"}
    
    base_fare = 0
    extra_km_charge = 0
    extra_hour_charge = 0
    
    contract_type = contract.get("contract_type")
    
    if contract_type == "PER_KM":
        rate_per_km = contract.get("rate_per_km", 0)
        min_km = contract.get("minimum_km_per_day", 0)
        chargeable_km = max(total_km, min_km)
        base_fare = chargeable_km * rate_per_km
        
    elif contract_type == "PACKAGE":
        package_km = contract.get("package_km", 80)
        package_hours = contract.get("package_hours", 8)
        package_rate = contract.get("package_rate", 0)
        extra_km_rate = contract.get("extra_km_rate", 0)
        extra_hour_rate = contract.get("extra_hour_rate", 0)
        
        base_fare = package_rate
        
        if total_km > package_km:
            extra_km_charge = (total_km - package_km) * extra_km_rate
        
        if total_hours > package_hours:
            extra_hour_charge = (total_hours - package_hours) * extra_hour_rate
            
    elif contract_type == "FIXED_MONTHLY":
        # Monthly contracts are billed separately
        base_fare = 0
        
    elif contract_type == "PER_DAY":
        daily_rate = contract.get("daily_rate", 0)
        included_km = contract.get("included_km", 0)
        extra_km_rate = contract.get("extra_km_rate", 0)
        
        base_fare = daily_rate
        if total_km > included_km:
            extra_km_charge = (total_km - included_km) * extra_km_rate
    
    # Check vehicle rate cards for specific rates
    vehicle_rate_cards = contract.get("vehicle_rate_cards", [])
    for card in vehicle_rate_cards:
        if card.get("vehicle_category", "").upper() == vehicle_type.upper():
            if is_outstation:
                rate = card.get("outstation_per_km", 0)
                min_km = card.get("outstation_min_km_per_day", 300)
                chargeable_km = max(total_km, min_km)
                base_fare = chargeable_km * rate
            else:
                # Use appropriate package based on hours
                if total_hours <= 4:
                    base_fare = card.get("local_4hr_40km", 0)
                    extra_km_rate = card.get("local_extra_km", 0)
                    if total_km > 40:
                        extra_km_charge = (total_km - 40) * extra_km_rate
                elif total_hours <= 8:
                    base_fare = card.get("local_8hr_80km", 0)
                    extra_km_rate = card.get("local_extra_km", 0)
                    if total_km > 80:
                        extra_km_charge = (total_km - 80) * extra_km_rate
                else:
                    base_fare = card.get("local_12hr_120km", 0)
                    extra_km_rate = card.get("local_extra_km", 0)
                    if total_km > 120:
                        extra_km_charge = (total_km - 120) * extra_km_rate
            break
    
    total = base_fare + extra_km_charge + extra_hour_charge
    
    return {
        "base_fare": base_fare,
        "extra_km_charge": extra_km_charge,
        "extra_hour_charge": extra_hour_charge,
        "total": total
    }


async def generate_invoice_number() -> str:
    """Generate unique invoice number"""
    from datetime import datetime
    count = await db.invoices.count_documents({})
    return f"INV-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
