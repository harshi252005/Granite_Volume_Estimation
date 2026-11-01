from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
# pyrefly: ignore [missing-import]
from ..database import get_db
# pyrefly: ignore [missing-import]
from ..models import AuditLog, GraniteBlock, Measurement, Seigniorage, User
# pyrefly: ignore [missing-import]
from ..schemas import AuditLogResponse, DashboardStats, UserResponse
# pyrefly: ignore [missing-import]
from ..auth import get_current_user, RoleChecker

router = APIRouter(tags=["Audit & Analytics"])

@router.get("/api/audit-logs", response_model=List[AuditLogResponse])
def get_all_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "dmgo"]))
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()

@router.get("/api/audit-logs/{block_id}", response_model=List[AuditLogResponse])
def get_block_audit_logs(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AuditLog).filter(AuditLog.block_id == block_id).order_by(AuditLog.timestamp.asc()).all()

@router.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
# pyrefly: ignore [missing-import]
    from ..models import Quarry
    from sqlalchemy import func
    base_query = db.query(GraniteBlock)
    if current_user.role == "operator":
        if current_user.quarry_id:
            base_query = base_query.filter(GraniteBlock.quarry_id == current_user.quarry_id)
        else:
            base_query = base_query.filter(False)
    elif current_user.role == "dmgo":
        target_dist = district if district is not None else current_user.district
        if target_dist and target_dist.upper() != "ALL":
            base_query = base_query.join(Quarry, GraniteBlock.quarry_id == Quarry.id).filter(
                func.lower(Quarry.district) == target_dist.lower()
            )
            
    # Retrieve query counts
    total = base_query.count()
    registered = base_query.filter(GraniteBlock.status.in_(["registered", "ai_measured"])).count()
    
    # DMGO approved / weighbridge checked / dispatched are all verified
    verified = base_query.filter(
        GraniteBlock.status.in_(["dmgo_approved", "weighbridge_approved", "weighbridge_verified", "weighbridge_flagged", "dispatched"])
    ).count()
    
    flagged = base_query.filter(GraniteBlock.status == "weighbridge_flagged").count()
    dispatched = base_query.filter(GraniteBlock.status == "dispatched").count()

    # Detailed operational metrics
    pending_review = base_query.filter(
        GraniteBlock.status.in_(["check_requested", "check_measurement_requested", "ai_measured"])
    ).count()
    approved_blocks = base_query.filter(
        GraniteBlock.status.in_(["dmgo_approved", "permit_ready"])
    ).count()
    rejected_blocks = base_query.filter(GraniteBlock.status == "dmgo_rejected").count()
    dressed_blocks = base_query.filter(GraniteBlock.block_type == "dressed").count()
    undressed_blocks = base_query.filter(GraniteBlock.block_type == "undressed").count()

    # District quarries count
    if current_user.role == "dmgo" and current_user.district:
        quarry_count = db.query(Quarry).filter(Quarry.district == current_user.district).count()
    elif current_user.role == "operator" and current_user.quarry_id:
        quarry_count = 1
    else:
        quarry_count = db.query(Quarry).count()
    
    # Volume calculation summaries
    vol_query = db.query(func.sum(Measurement.volume)).select_from(Measurement).join(GraniteBlock, Measurement.block_id == GraniteBlock.id)
    fee_query = db.query(func.sum(Seigniorage.total_fee)).select_from(Seigniorage).join(GraniteBlock, Seigniorage.block_id == GraniteBlock.id)
    
    if current_user.role == "operator":
        if current_user.quarry_id:
            vol_query = vol_query.filter(GraniteBlock.quarry_id == current_user.quarry_id)
            fee_query = fee_query.filter(GraniteBlock.quarry_id == current_user.quarry_id)
        else:
            vol_query = vol_query.filter(False)
            fee_query = fee_query.filter(False)
    elif current_user.role == "dmgo":
        target_dist = district if district is not None else current_user.district
        if target_dist and target_dist.upper() != "ALL":
            vol_query = vol_query.join(Quarry, GraniteBlock.quarry_id == Quarry.id).filter(func.lower(Quarry.district) == target_dist.lower())
            fee_query = fee_query.join(Quarry, GraniteBlock.quarry_id == Quarry.id).filter(func.lower(Quarry.district) == target_dist.lower())

    vol_sum = vol_query.scalar() or 0.0
    fee_sum = fee_query.scalar() or 0.0

    # Granite type distribution (top 6 types)
    type_query = db.query(Seigniorage.granite_type, func.count(Seigniorage.id)).select_from(Seigniorage).join(GraniteBlock, Seigniorage.block_id == GraniteBlock.id)
    if current_user.role == "operator" and current_user.quarry_id:
        type_query = type_query.filter(GraniteBlock.quarry_id == current_user.quarry_id)
    elif current_user.role == "dmgo":
        target_dist = district if district is not None else current_user.district
        if target_dist and target_dist.upper() != "ALL":
            type_query = type_query.join(Quarry, GraniteBlock.quarry_id == Quarry.id).filter(func.lower(Quarry.district) == target_dist.lower())
    
    type_rows = type_query.group_by(Seigniorage.granite_type).order_by(func.count(Seigniorage.id).desc()).limit(6).all()
    granite_types = {r[0].title(): r[1] for r in type_rows if r[0]}
    
    user_count = db.query(User).count()
    audit_count = db.query(AuditLog).count()
    
    return DashboardStats(
        total_blocks=total,
        registered_blocks=registered,
        verified_blocks=verified,
        flagged_blocks=flagged,
        dispatched_blocks=dispatched,
        total_volume=round(float(vol_sum), 3),
        total_seigniorage=round(float(fee_sum), 2),
        total_users=user_count,
        total_audit_logs=audit_count,
        pending_review=pending_review,
        approved_blocks=approved_blocks,
        rejected_blocks=rejected_blocks,
        dressed_blocks=dressed_blocks,
        undressed_blocks=undressed_blocks,
        district_quarries=quarry_count,
        granite_types=granite_types
    )

@router.get("/api/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin"]))
):
    return db.query(User).order_by(User.id.asc()).all()
