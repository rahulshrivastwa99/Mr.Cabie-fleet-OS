"""PDF Contract Extraction Service using OpenAI"""
import os
import base64
from typing import Optional

# Try to import emergentintegrations
try:
    from emergentintegrations.llm.chat import chat, LlmMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False


async def extract_rates_from_pdf(pdf_content: bytes) -> Optional[dict]:
    """
    Extract rate information from a PDF contract using AI
    Returns structured rate data or None if extraction fails
    """
    if not EMERGENT_AVAILABLE:
        return None
    
    try:
        # Convert PDF to base64
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
        
        # Create extraction prompt
        extraction_prompt = """Analyze this PDF contract/rate card and extract all pricing information in a structured format.

Extract the following if present:
1. Vehicle categories and their rates (SEDAN, SUV, PREMIUM, etc.)
2. Local packages (4hr/40km, 8hr/80km, 12hr/120km)
3. Extra km/hour charges
4. Outstation rates per km
5. Minimum km per day requirements
6. Driver allowance/batta
7. Night charges
8. Fixed route packages with prices
9. Monthly rental rates
10. GST percentage
11. Terms about toll, parking, permits

Return as JSON with this structure:
{
    "vehicle_rate_cards": [
        {
            "vehicle_category": "SEDAN",
            "vehicle_examples": "Dzire, Xcent",
            "local_4hr_40km": 1200,
            "local_8hr_80km": 1800,
            "local_12hr_120km": 2400,
            "local_extra_km": 14,
            "local_extra_hour": 150,
            "outstation_per_km": 12,
            "outstation_min_km_per_day": 300,
            "outstation_driver_allowance": 250,
            "monthly_rental": 45000,
            "monthly_included_km": 2500,
            "monthly_extra_km": 12
        }
    ],
    "fixed_routes": [
        {
            "route_name": "City A to City B",
            "from_location": "City A",
            "to_location": "City B",
            "one_way_rates": {"SEDAN": 4000, "SUV": 5500},
            "round_trip_rates": {"SEDAN": 7000, "SUV": 9500},
            "includes_toll": true
        }
    ],
    "extra_charges_config": {
        "driver_night_allowance": 250,
        "waiting_charge_per_hour": 100,
        "gst_percentage": 5,
        "toll_included": false,
        "parking_included": false,
        "notes": "Any special terms"
    }
}

Only include fields that are explicitly mentioned in the document. Use null for missing values."""

        messages = [
            LlmMessage(
                role="user",
                content=extraction_prompt,
                images=[f"data:application/pdf;base64,{pdf_base64}"]
            )
        ]
        
        response = await chat(
            api_key=os.environ.get('LLM_API_KEY'),
            messages=messages,
            model="gpt-4o"
        )
        
        # Parse the JSON response
        import json
        response_text = response.message
        
        # Try to extract JSON from the response
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text.strip()
        
        return json.loads(json_str)
        
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return None
