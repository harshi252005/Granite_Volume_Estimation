"""
Seed realistic statutory seizure and enforcement check records into smart_granite.db.
Resolves 0 Seized Blocks and 0 Total Checks in the Vigilance Enforcement Portal.
"""
from app.database import SessionLocal
from app.models import GraniteBlock, AuditLog, Dispatch, Weighbridge
from datetime import datetime, timedelta
import random

db = SessionLocal()

CHECKPOSTS = [
    "Nellore NH-16 Checkpost",
    "Krishna Nandigama Checkpost",
    "Anantapur NH-44 Checkpost",
    "Visakhapatnam Bypass Checkpost",
    "Guntur Chilakaluripet Checkpost",
    "Kurnool Dhone Checkpost",
    "Prakasam Medarmetla Checkpost",
    "Chittoor Palamaner Checkpost",
    "East Godavari Kovvur Checkpost",
    "Kadapa Rayachoti Checkpost",
]

SEIZURE_GROUNDS = [
    "Weight discrepancy exceeds statutory 15% threshold under AP Minor Mineral Rules 1966",
    "Transit without valid OMEPS e-Transit Pass under Section 21(4) MMDR Act 1957",
    "Vehicle registration mismatch intercepted at roadside checkpost",
    "Forged Form G physical pass intercepted during mobile squad inspection",
    "Block dimension exceeds permitted transit volume by 22.4%",
]

try:
    # 1. Select 42 blocks from weighbridge_flagged or dispatched to set as seized
    candidates = db.query(GraniteBlock).filter(
        GraniteBlock.status.in_(["weighbridge_flagged", "dispatched"])
    ).limit(42).all()

    now = datetime.utcnow()
    count_seized = 0

    for i, block in enumerate(candidates):
        block.status = "seized"
        cp = CHECKPOSTS[i % len(CHECKPOSTS)]
        ground = SEIZURE_GROUNDS[i % len(SEIZURE_GROUNDS)]
        compounding = random.choice([50000, 75000, 100000, 125000, 150000, 200000, 250000])
        notice_no = f"SN-20250911-{i+1:04d}"
        
        block.dmgo_remarks = f"SEIZED under Sec 21(4) MMDR Act 1957 at {cp} by vigilance. Notice: {notice_no}"
        
        # Add AuditLog for Seizure Notice
        ts = now - timedelta(hours=random.randint(1, 72), minutes=random.randint(5, 50))
        details = (
            f"SEIZURE NOTICE #{notice_no} | "
            f"Ground: {ground} | "
            f"Checkpost: {cp} | "
            f"Officer: vigilance | "
            f"Compounding Penalty: ₹{compounding:,}"
        )
        audit = AuditLog(
            block_id=block.id,
            event="SEIZURE_NOTICE_ISSUED",
            username="vigilance",
            details=details,
            timestamp=ts,
        )
        db.add(audit)
        count_seized += 1

    # 2. Add 60 roadside check audit logs (mix of pass and flagged)
    more_blocks = db.query(GraniteBlock).filter(
        GraniteBlock.status.in_(["dispatched", "weighbridge_verified", "weighbridge_flagged"])
    ).offset(50).limit(60).all()

    for j, b in enumerate(more_blocks):
        cp = CHECKPOSTS[j % len(CHECKPOSTS)]
        act = "ENFORCEMENT_PASS" if j % 3 != 0 else "ENFORCEMENT_FLAGGED"
        ts = now - timedelta(hours=random.randint(1, 48), minutes=random.randint(10, 55))
        det = (
            f"Checkpost: {cp} | "
            f"Vehicle: AP{random.randint(10,39)}AB{random.randint(1000,9999)} | "
            f"Action: {'PASS' if act == 'ENFORCEMENT_PASS' else 'FLAG'} | "
            f"Remarks: Roadside biometric check & dimensional inspection"
        )
        db.add(AuditLog(
            block_id=b.id,
            event=act,
            username="vigilance",
            details=det,
            timestamp=ts,
        ))

    db.commit()
    print(f"Successfully seeded {count_seized} seized blocks and 60 enforcement check audit logs.")
except Exception as e:
    db.rollback()
    print("Error seeding seizures:", e)
finally:
    db.close()
