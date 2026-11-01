from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime as _dt
# pyrefly: ignore [missing-import]
from ..database import get_db
# pyrefly: ignore [missing-import]
from ..models import GraniteBlock, Weighbridge, AuditLog, User
# pyrefly: ignore [missing-import]
from ..schemas import WeighbridgeResponse
# pyrefly: ignore [missing-import]
from ..auth import RoleChecker, get_current_user
# pyrefly: ignore [missing-import]
from ..config_manager import load_settings

router = APIRouter(prefix="/api/weighbridge", tags=["Weighbridge Validation"])


# ── GET all weighbridge records ───────────────────────────────────────────────
@router.get("", response_model=List[WeighbridgeResponse])
def get_all_weighbridge_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = db.query(Weighbridge).options(
        joinedload(Weighbridge.block).joinedload(GraniteBlock.measurement)
    ).order_by(Weighbridge.id.desc()).limit(200).all()

    for r in records:
        if r.block and r.block.measurement:
            r.ai_estimated_weight = r.block.measurement.estimated_weight
        r.created_at = r.validation_time
    return records


# ── GET single weighbridge record ─────────────────────────────────────────────
@router.get("/{block_id}", response_model=WeighbridgeResponse)
def get_weighbridge_record(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(Weighbridge).options(
        joinedload(Weighbridge.block).joinedload(GraniteBlock.measurement)
    ).filter(Weighbridge.block_id == block_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Weighbridge record not found")
    if record.block and record.block.measurement:
        record.ai_estimated_weight = record.block.measurement.estimated_weight
    record.created_at = record.validation_time
    return record


# ── POST initial weighbridge validation ───────────────────────────────────────
@router.post("/{block_id}", response_model=WeighbridgeResponse)
def validate_weighbridge(
    block_id: str,
    actual_weight: float = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["weighbridge", "admin"]))
):
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Granite block not found"
        )

    if not block.measurement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Granite block measurements are not available yet"
        )

    # Calculate variance against AI estimate
    estimated = block.measurement.estimated_weight
    if estimated == 0:
        difference = 0.0
    else:
        difference = abs(estimated - actual_weight) / estimated * 100.0

    # Validation status based on statutory tolerance (config: leakage_threshold_percent, default 8.0%)
    settings = load_settings()
    threshold = float(settings.get("leakage_threshold_percent", 8.0))
    validation_status = "approved" if difference <= threshold else "flagged"

    # Upsert weighbridge record
    weigh_record = db.query(Weighbridge).filter(Weighbridge.block_id == block_id).first()
    if weigh_record:
        weigh_record.actual_weight = actual_weight
        weigh_record.difference_percentage = round(difference, 2)
        weigh_record.status = validation_status
        weigh_record.operator_username = current_user.username
    else:
        weigh_record = Weighbridge(
            block_id=block_id,
            actual_weight=actual_weight,
            difference_percentage=round(difference, 2),
            status=validation_status,
            operator_username=current_user.username
        )
        db.add(weigh_record)

    # Update block status
    block.status = f"weighbridge_{validation_status}"

    # Audit log
    db_audit = AuditLog(
        block_id=block_id,
        event=f"Weighbridge Check: {validation_status.upper()}",
        username=current_user.username,
        details=(
            f"Actual Weight: {actual_weight} MT | AI Weight: {estimated} MT "
            f"(Diff: {round(difference, 2)}%). Status: {block.status}."
        )
    )
    db.add(db_audit)
    db.commit()
    db.refresh(weigh_record)
    return weigh_record


# ── PUT Re-Weigh (corrected reading by weighbridge operator) ──────────────────
@router.put("/{block_id}/reweigh", response_model=WeighbridgeResponse)
def reweigh_block(
    block_id: str,
    actual_weight: float = Form(...),
    remarks: str = Form("Re-weigh reading after calibration check"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["weighbridge", "admin"]))
):
    """
    Submit a corrected weight reading for a previously flagged block.
    Recalculates variance; if within threshold → approved, else remains flagged.
    Records previous weight and increments reweigh_count for audit trail.
    Only weighbridge operators and admins can re-weigh.
    """
    weigh_record = db.query(Weighbridge).filter(Weighbridge.block_id == block_id).first()
    if not weigh_record:
        raise HTTPException(status_code=404, detail="No weighbridge record found for this block")

    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block or not block.measurement:
        raise HTTPException(status_code=400, detail="Block measurements not available")

    estimated = block.measurement.estimated_weight
    difference = 0.0 if estimated == 0 else abs(estimated - actual_weight) / estimated * 100.0

    settings = load_settings()
    threshold = float(settings.get("leakage_threshold_percent", 8.0))
    new_status = "approved" if difference <= threshold else "flagged"

    # Preserve previous weight for audit trail
    prev_weight = weigh_record.actual_weight
    weigh_record.previous_weight = prev_weight
    weigh_record.actual_weight = actual_weight
    weigh_record.difference_percentage = round(difference, 2)
    weigh_record.status = new_status
    weigh_record.resolution_action = "reweigh"
    weigh_record.resolution_by = current_user.username
    weigh_record.resolution_remarks = remarks
    weigh_record.resolution_time = _dt.utcnow()
    weigh_record.reweigh_count = (weigh_record.reweigh_count or 0) + 1

    block.status = f"weighbridge_{new_status}"

    db.add(AuditLog(
        block_id=block_id,
        event=f"RE-WEIGH #{weigh_record.reweigh_count}: {new_status.upper()}",
        username=current_user.username,
        details=(
            f"Re-weigh #{weigh_record.reweigh_count}. "
            f"Previous: {prev_weight} MT → New: {actual_weight} MT | "
            f"AI Est: {estimated} MT (Variance: {round(difference, 2)}%). "
            f"Remarks: {remarks}"
        ),
    ))
    db.commit()
    db.refresh(weigh_record)
    return weigh_record


# ── PUT DMGO Override (approve despite variance) ──────────────────────────────
@router.put("/{block_id}/override", response_model=WeighbridgeResponse)
def override_weighbridge(
    block_id: str,
    remarks: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["dmgo", "admin"]))
):
    """
    DMGO officer overrides a flagged weighbridge record with official justification.
    Used when variance is explainable (certified scale error, moisture, stone chipping).
    Block proceeds to approved status with full DMGO authority and audit trail.
    Only DMGO officers and admins can override.
    """
    weigh_record = db.query(Weighbridge).filter(Weighbridge.block_id == block_id).first()
    if not weigh_record:
        raise HTTPException(status_code=404, detail="No weighbridge record found for this block")
    if weigh_record.status not in ("flagged",):
        raise HTTPException(status_code=400, detail="Only flagged records can be overridden by DMGO")

    weigh_record.status = "dmgo_override"
    weigh_record.resolution_action = "dmgo_override"
    weigh_record.resolution_by = current_user.username
    weigh_record.resolution_remarks = remarks
    weigh_record.resolution_time = _dt.utcnow()

    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if block:
        block.status = "weighbridge_approved"
        block.dmgo_remarks = f"WB Override by {current_user.username}: {remarks}"

    db.add(AuditLog(
        block_id=block_id,
        event="WB OVERRIDE: DMGO APPROVED",
        username=current_user.username,
        details=(
            f"DMGO overrode flagged weighbridge record. "
            f"Actual: {weigh_record.actual_weight} MT | "
            f"AI Est: {block.measurement.estimated_weight if block and block.measurement else 'N/A'} MT | "
            f"Variance: {weigh_record.difference_percentage}% | Reason: {remarks}"
        ),
    ))
    db.commit()
    db.refresh(weigh_record)
    return weigh_record


# ── PUT Escalate to Enforcement ───────────────────────────────────────────────
@router.put("/{block_id}/escalate", response_model=WeighbridgeResponse)
def escalate_weighbridge(
    block_id: str,
    remarks: str = Form("Escalated to enforcement for physical inspection"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["dmgo", "admin", "enforcement"]))
):
    """
    Escalate a flagged block for physical enforcement inspection/seizure.
    Block status → weighbridge_escalated. Block cannot be dispatched.
    Creates audit trail for enforcement records.
    """
    weigh_record = db.query(Weighbridge).filter(Weighbridge.block_id == block_id).first()
    if not weigh_record:
        raise HTTPException(status_code=404, detail="No weighbridge record found for this block")

    weigh_record.status = "escalated"
    weigh_record.resolution_action = "escalated"
    weigh_record.resolution_by = current_user.username
    weigh_record.resolution_remarks = remarks
    weigh_record.resolution_time = _dt.utcnow()

    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if block:
        block.status = "weighbridge_escalated"

    db.add(AuditLog(
        block_id=block_id,
        event="WB ESCALATED: ENFORCEMENT",
        username=current_user.username,
        details=(
            f"Flagged block escalated to enforcement for physical inspection. "
            f"Actual: {weigh_record.actual_weight} MT | "
            f"Variance: {weigh_record.difference_percentage}% | Reason: {remarks}"
        ),
    ))
    db.commit()
    db.refresh(weigh_record)
    return weigh_record
