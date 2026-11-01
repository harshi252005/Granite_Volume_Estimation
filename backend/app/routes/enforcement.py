"""
enforcement.py
--------------
Road Vigilance & Checkpost Enforcement Portal backend.

Provides APIs for AP DMG Vigilance Squads intercepting granite trucks
on highways and checkposts under Section 21 MMDR Act 1957.

Per AP DMG Orientation (Dy. Director Srinivas Chaudhary):
  "Our vigilance squads will be checking road transportation,
   in that case also they'll be taking these measurements and
   calculating dimensions of the block."
"""

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from ..database import get_db
# pyrefly: ignore [missing-import]
from ..models import GraniteBlock, Dispatch, Weighbridge, AuditLog, Quarry, User, Seigniorage, Measurement
# pyrefly: ignore [missing-import]
from ..auth import get_current_user, RoleChecker

router = APIRouter(prefix="/api/enforcement", tags=["Road Enforcement"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class RoadsideCheckPayload(BaseModel):
    block_id: str
    vehicle_number: str
    checkpost_location: str
    intercepted_length: Optional[float] = None
    intercepted_breadth: Optional[float] = None
    intercepted_height: Optional[float] = None
    officer_remarks: Optional[str] = None
    flag_reason: Optional[str] = None    # "vehicle_mismatch" | "dimension_excess" | "no_permit" | "permit_expired"
    action: str = "flag"                 # "pass" | "flag" | "seize"


class SeizerNoticePayload(BaseModel):
    block_id: str
    seizure_ground: str
    officer_name: str
    checkpost: str
    compounding_amount: Optional[float] = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/scan/{block_id}")
def scan_block_at_checkpost(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scan a block at a highway checkpost by QR code or Block ID.
    Returns complete transit pass, block dimensions, seigniorage, and verification status.
    """
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail=f"Block ID '{block_id}' not found in AP Mines Registry")

    m = block.measurement
    s = block.seigniorage
    d = block.dispatch
    w = block.weighbridge
    quarry = block.quarry

    # Determine permit validity
    permit_valid = bool(d and d.e_permit_number)
    status_ok = block.status in ["dispatched", "weighbridge_approved", "weighbridge_verified"]

    # Compute statutory challan breakdown from settings
    # pyrefly: ignore [missing-import]
    from ..config_manager import load_settings
    settings = load_settings()
    dmf_pct = settings.get("dmf_percent", 30.0)
    merit_pct = settings.get("merit_percent", 2.0)
    green_cess_per_mt = settings.get("green_cess_per_mt", 50.0)

    base_seig = s.total_fee if s else 0.0
    dmf = round(base_seig * dmf_pct / 100, 2)
    merit = round(base_seig * merit_pct / 100, 2)
    est_weight = m.estimated_weight if m else 0.0
    green_cess = round(est_weight * green_cess_per_mt, 2)
    total_challan = round(base_seig + dmf + merit + green_cess, 2)

    return {
        "block_id": block.id,
        "status": block.status,
        "permit_valid": permit_valid,
        "status_ok": status_ok,
        "quarry": {
            "id": quarry.id if quarry else None,
            "name": quarry.name if quarry else None,
            "district": quarry.district if quarry else None,
            "lessee_id": quarry.lessee_id if quarry else None,
            "mdl_number": quarry.mdl_number if quarry else None,
            "location_gps": quarry.location_gps if quarry else None,
        },
        "block_type": block.block_type,
        "gps_origin": block.gps,
        "measurement": {
            "length": m.length if m else None,
            "breadth": m.breadth if m else None,
            "height": m.height if m else None,
            "volume": m.volume if m else None,
            "estimated_weight": m.estimated_weight if m else None,
            "length_readings": m.length_readings if m else None,
            "breadth_readings": m.breadth_readings if m else None,
            "height_readings": m.height_readings if m else None,
            "measurement_method": m.measurement_method if m else None,
            "confidence": m.measurement_confidence if m else None,
        } if m else None,
        "seigniorage": {
            "granite_type": s.granite_type if s else None,
            "government_category": s.government_category if s else None,
            "class_status": s.class_status if s else None,
            "rate_per_mt": s.rate_per_mt if s else None,
            "base_seigniorage": round(base_seig, 2),
            "dmf": dmf,
            "merit": merit,
            "green_cess": green_cess,
            "total_challan": total_challan,
        },
        "dispatch": {
            "vehicle_number": d.vehicle_number if d else None,
            "driver_name": d.driver_name if d else None,
            "destination": d.destination if d else None,
            "e_permit_number": d.e_permit_number if d else None,
            "transit_form_no": d.transit_form_no if d else None,
            "dispatch_time": d.dispatch_time.isoformat() if d and d.dispatch_time else None,
        } if d else None,
        "weighbridge": {
            "actual_weight": w.actual_weight if w else None,
            "difference_percentage": w.difference_percentage if w else None,
            "status": w.status if w else None,
        } if w else None,
        "warnings": _compute_warnings(block, d, w, m),
    }


def _compute_warnings(block, dispatch, weighbridge, measurement):
    warnings = []
    if not dispatch:
        warnings.append({"code": "NO_DISPATCH", "severity": "CRITICAL", "message": "No transit permit found — block may be unlicensed transit"})
    elif not dispatch.e_permit_number:
        warnings.append({"code": "NO_PERMIT_NUMBER", "severity": "HIGH", "message": "Transit dispatch exists but e-Permit number is missing"})

    if block.status not in ["dispatched", "weighbridge_approved", "weighbridge_verified"]:
        warnings.append({"code": "STATUS_NOT_DISPATCHED", "severity": "HIGH", "message": f"Block status is '{block.status}' — not cleared for transit"})

    if weighbridge and weighbridge.status == "flagged":
        warnings.append({"code": "WEIGHBRIDGE_FLAGGED", "severity": "HIGH", "message": f"Weight mismatch flagged at weighbridge ({weighbridge.difference_percentage}% variance)"})

    if measurement and measurement.estimated_weight and measurement.estimated_weight > 30:
        warnings.append({"code": "OVERSIZE_BLOCK", "severity": "MEDIUM", "message": "Large block (>30 MT) — verify vehicle carrying capacity"})

    return warnings


@router.get("/flagged")
def get_flagged_transits(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all blocks currently flagged or seized at checkposts."""
    logs = db.query(AuditLog).filter(
        or_(
            AuditLog.event.like("ENFORCEMENT_%"),
            AuditLog.event.like("ROADSIDE_%"),
            AuditLog.event.like("SEIZURE_%"),
            AuditLog.event.like("%Flagged%"),
            AuditLog.event.like("%FLAG%"),
        )
    ).order_by(desc(AuditLog.timestamp)).limit(limit).all()

    return [
        {
            "id": l.id,
            "block_id": l.block_id,
            "event": l.event,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "officer": l.username,
            "details": l.details,
        }
        for l in logs
    ]


@router.get("/vehicles/search")
def search_by_vehicle(
    vehicle_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search all transit passes by vehicle registration number (partial match)."""
    dispatches = db.query(Dispatch).filter(
        Dispatch.vehicle_number.ilike(f"%{vehicle_number}%")
    ).order_by(desc(Dispatch.dispatch_time)).limit(30).all()

    results = []
    for d in dispatches:
        block = db.query(GraniteBlock).filter(GraniteBlock.id == d.block_id).first()
        results.append({
            "block_id": d.block_id,
            "vehicle_number": d.vehicle_number,
            "driver_name": d.driver_name,
            "destination": d.destination,
            "e_permit_number": d.e_permit_number,
            "transit_form_no": d.transit_form_no,
            "dispatch_time": d.dispatch_time.isoformat() if d.dispatch_time else None,
            "block_status": block.status if block else None,
            "quarry_district": block.quarry.district if block and block.quarry else None,
        })
    return results


@router.post("/roadside-check")
def perform_roadside_check(
    payload: RoadsideCheckPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Field officer intercepts a granite truck and performs roadside dimension check.
    Logs the check measurement and flags or seizes if variance exceeds threshold.
    """
    block = db.query(GraniteBlock).filter(GraniteBlock.id == payload.block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{payload.block_id}' not found")

    m = block.measurement

    # Compute dimension variance if officer measured the block
    variances = {}
    action = payload.action
    if m and payload.intercepted_length and payload.intercepted_breadth and payload.intercepted_height:
        for dim, permitted, intercepted in [
            ("length",  m.length,  payload.intercepted_length),
            ("breadth", m.breadth, payload.intercepted_breadth),
            ("height",  m.height,  payload.intercepted_height),
        ]:
            if permitted and permitted > 0:
                pct = abs(permitted - intercepted) / permitted * 100.0
                variances[dim] = {
                    "permitted_cm": permitted,
                    "intercepted_cm": intercepted,
                    "variance_pct": round(pct, 2),
                    "exceeds_5pct": pct > 5.0,
                    "exceeds_15pct": pct > 15.0,
                }
                if pct > 15.0 and action == "pass":
                    action = "flag"

    # Log enforcement event
    event_map = {"pass": "ENFORCEMENT_PASS", "flag": "ENFORCEMENT_FLAGGED", "seize": "ENFORCEMENT_SEIZURE"}
    details = (
        f"Checkpost: {payload.checkpost_location} | "
        f"Vehicle: {payload.vehicle_number} | "
        f"Action: {action.upper()} | "
        f"Variances: {variances} | "
        f"Reason: {payload.flag_reason or 'N/A'} | "
        f"Remarks: {payload.officer_remarks or 'N/A'}"
    )

    audit = AuditLog(
        block_id=payload.block_id,
        event=event_map.get(action, "ENFORCEMENT_FLAGGED"),
        username=current_user.username,
        details=details,
    )
    db.add(audit)

    # Update block status if seized
    if action == "seize":
        block.status = "seized"
        block.dmgo_remarks = f"SEIZED at {payload.checkpost_location} by {current_user.username}"

    db.commit()

    return {
        "status": "recorded",
        "action": action,
        "block_id": payload.block_id,
        "variances": variances,
        "audit_event": event_map.get(action, "ENFORCEMENT_FLAGGED"),
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/seizure-notice")
def issue_seizure_notice(
    payload: SeizerNoticePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["enforcement", "admin", "dmgo"]))
):
    """Issue an official seizure notice under Section 21 MMDR Act 1957."""
    block = db.query(GraniteBlock).filter(GraniteBlock.id == payload.block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    block.status = "seized"
    notice_no = f"SN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    details = (
        f"SEIZURE NOTICE #{notice_no} | "
        f"Ground: {payload.seizure_ground} | "
        f"Checkpost: {payload.checkpost} | "
        f"Officer: {payload.officer_name} | "
        f"Compounding Amount: ₹{payload.compounding_amount or 0}"
    )
    audit = AuditLog(
        block_id=payload.block_id,
        event="SEIZURE_NOTICE_ISSUED",
        username=current_user.username,
        details=details,
    )
    db.add(audit)
    db.commit()

    return {
        "notice_number": notice_no,
        "block_id": payload.block_id,
        "status": "seized",
        "details": details,
    }


@router.get("/dashboard/stats")
def enforcement_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enforcement dashboard statistics: flagged, seized, cleared today."""
    total_dispatched = db.query(GraniteBlock).filter(
        GraniteBlock.status.in_(["dispatched", "weighbridge_verified", "weighbridge_approved", "seized"])
    ).count()

    seized = db.query(GraniteBlock).filter(GraniteBlock.status == "seized").count()

    wb_flagged = db.query(GraniteBlock).filter(
        GraniteBlock.status == "weighbridge_flagged"
    ).count()

    # Total statutory checkpost and roadside inspection checks
    total_enforcement_checks = db.query(AuditLog).filter(
        or_(
            AuditLog.event.like("ENFORCEMENT_%"),
            AuditLog.event.like("ROADSIDE_%"),
            AuditLog.event.like("SEIZURE_%"),
            AuditLog.event.like("%Weighbridge%"),
        )
    ).count()

    recent_flags = db.query(AuditLog).filter(
        or_(
            AuditLog.event.like("ENFORCEMENT_FLAGGED"),
            AuditLog.event.like("SEIZURE_%"),
            AuditLog.event.like("%Flagged%"),
            AuditLog.event.like("%FLAG%"),
        )
    ).order_by(desc(AuditLog.timestamp)).limit(6).all()

    return {
        "total_in_transit": total_dispatched,
        "total_seized": seized,
        "weighbridge_flagged": wb_flagged,
        "total_enforcement_checks": total_enforcement_checks,
        "recent_incidents": [
            {
                "block_id": l.block_id,
                "event": l.event,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                "officer": l.username,
                "details": l.details[:200] if l.details else "",
            }
            for l in recent_flags
        ],
    }
