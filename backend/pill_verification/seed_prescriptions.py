"""
Seed script — inserts sample prescriptions into MongoDB for testing the
pill verification feature. Run this once after setting up your .env.

Usage:
    python -m pill_verification.seed_prescriptions
"""

import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

SAMPLE_PRESCRIPTIONS = [
    {
        "prescription_id": "RX1001",
        "patient_id": "P001",
        "patient_name": "Ravi Kumar",
        "doctor_name": "Dr. Anjali Mehta",
        "date_issued": "2026-08-15",
        "medicines": [
            {"drug_id": "para500", "salt_composition": "Paracetamol", "strength": "500mg", "dosage": "1-0-1", "duration_days": 5},
            {"drug_id": "amox500", "salt_composition": "Amoxicillin", "strength": "500mg", "dosage": "1-1-1", "duration_days": 7},
        ],
    },
    {
        "prescription_id": "RX1002",
        "patient_id": "P002",
        "patient_name": "Sneha Verma",
        "doctor_name": "Dr. Rakesh Sinha",
        "date_issued": "2026-08-18",
        "medicines": [
            {"drug_id": "pantop40", "salt_composition": "Pantoprazole", "strength": "40mg", "dosage": "1-0-0", "duration_days": 10},
            {"drug_id": "metf500", "salt_composition": "Metformin", "strength": "500mg", "dosage": "1-0-1", "duration_days": 30},
        ],
    },
]


async def seed():
    mongo_url = os.environ["MONGO_URL"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ["DB_NAME"]]

    for rx in SAMPLE_PRESCRIPTIONS:
        await db.prescriptions.update_one(
            {"prescription_id": rx["prescription_id"]},
            {"$set": rx},
            upsert=True,
        )
        print(f"Upserted prescription {rx['prescription_id']} for {rx['patient_name']}")

    client.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
