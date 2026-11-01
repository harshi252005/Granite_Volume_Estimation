from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from datetime import datetime, timedelta

from ..database import get_db
from ..models import GraniteBlock, Measurement, Seigniorage, Weighbridge, Dispatch, Quarry, User
from ..auth import get_current_user
from ..config_manager import load_settings

router = APIRouter(
    prefix="/api/analytics",
    tags=["Analytics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/state")
def get_state_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "dmgo"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Only consider blocks with seigniorage (measured)
    total_revenue = db.query(func.sum(Seigniorage.total_fee)).scalar() or 0
    total_mt = db.query(func.sum(Measurement.estimated_weight)).scalar() or 0
    
    # District Ranking by MT
    district_ranking = db.query(
        Quarry.district,
        func.sum(Measurement.estimated_weight).label('mt'),
        func.sum(Seigniorage.total_fee).label('revenue')
    ).join(GraniteBlock, Quarry.id == GraniteBlock.quarry_id)\
     .join(Measurement, GraniteBlock.id == Measurement.block_id)\
     .join(Seigniorage, GraniteBlock.id == Seigniorage.block_id)\
     .group_by(Quarry.district)\
     .order_by(desc('mt'))\
     .limit(10).all()
     
    # Format district ranking
    districts_data = [{"name": d[0], "mt": round(d[1] or 0, 2), "revenue": round(d[2] or 0, 2)} for d in district_ranking]
    
    # Monthly trend (last 6 months, using mock data it's all within 30 days but we group by day or week)
    # Let's group by day for the trend
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_trend = db.query(
        func.date(GraniteBlock.creation_time).label('date'),
        func.sum(Measurement.estimated_weight).label('mt')
    ).join(Measurement, GraniteBlock.id == Measurement.block_id)\
     .filter(GraniteBlock.creation_time >= thirty_days_ago)\
     .group_by(func.date(GraniteBlock.creation_time))\
     .order_by('date').all()
     
    trend_data = [{"date": d[0], "mt": round(d[1] or 0, 2)} for d in daily_trend]
    
    # KPIs
    pending_approvals = db.query(func.count(GraniteBlock.id)).filter(GraniteBlock.status == "ai_measured").scalar() or 0
    flagged_blocks = db.query(func.count(GraniteBlock.id)).filter(GraniteBlock.status == "weighbridge_flagged").scalar() or 0
    
    settings = load_settings()
    threshold = settings.get("leakage_threshold_percent", 5.0)
    
    # Revenue Leakage (estimated vs actual weight diff > threshold)
    leakage = db.query(
        func.sum((Weighbridge.actual_weight - Measurement.estimated_weight) * Seigniorage.rate_per_mt)
    ).select_from(Weighbridge)\
     .join(Measurement, Weighbridge.block_id == Measurement.block_id)\
     .join(Seigniorage, Weighbridge.block_id == Seigniorage.block_id)\
     .filter(Weighbridge.difference_percentage > threshold).scalar() or 0

    return {
        "total_revenue": total_revenue,
        "total_mt": total_mt,
        "district_ranking": districts_data,
        "trend_data": trend_data,
        "pending_approvals": pending_approvals,
        "flagged_blocks": flagged_blocks,
        "potential_leakage_recovered": leakage
    }

@router.get("/district/{district_name}")
def get_district_analytics(district_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "dmgo"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    total_revenue = db.query(func.sum(Seigniorage.total_fee))\
        .join(GraniteBlock, Seigniorage.block_id == GraniteBlock.id)\
        .join(Quarry, GraniteBlock.quarry_id == Quarry.id)\
        .filter(Quarry.district == district_name).scalar() or 0
        
    total_mt = db.query(func.sum(Measurement.estimated_weight))\
        .join(GraniteBlock, Measurement.block_id == GraniteBlock.id)\
        .join(Quarry, GraniteBlock.quarry_id == Quarry.id)\
        .filter(Quarry.district == district_name).scalar() or 0

    mandal_ranking = db.query(
        Quarry.mandal,
        func.sum(Measurement.estimated_weight).label('mt'),
        func.sum(Seigniorage.total_fee).label('revenue')
    ).join(GraniteBlock, Quarry.id == GraniteBlock.quarry_id)\
     .join(Measurement, GraniteBlock.id == Measurement.block_id)\
     .join(Seigniorage, GraniteBlock.id == Seigniorage.block_id)\
     .filter(Quarry.district == district_name)\
     .group_by(Quarry.mandal)\
     .order_by(desc('mt')).all()

    mandals_data = [{"name": m[0], "mt": round(m[1] or 0, 2), "revenue": round(m[2] or 0, 2)} for m in mandal_ranking]

    return {
        "district": district_name,
        "total_revenue": total_revenue,
        "total_mt": total_mt,
        "mandals": mandals_data
    }

@router.get("/mandal/{mandal_name}")
def get_mandal_analytics(mandal_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "dmgo"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    quarry_ranking = db.query(
        Quarry.name,
        Quarry.id,
        func.sum(Measurement.estimated_weight).label('mt'),
        func.sum(Seigniorage.total_fee).label('revenue')
    ).join(GraniteBlock, Quarry.id == GraniteBlock.quarry_id)\
     .join(Measurement, GraniteBlock.id == Measurement.block_id)\
     .join(Seigniorage, GraniteBlock.id == Seigniorage.block_id)\
     .filter(Quarry.mandal == mandal_name)\
     .group_by(Quarry.id)\
     .order_by(desc('mt')).all()

    quarries_data = [{"id": q[1], "name": q[0], "mt": round(q[2] or 0, 2), "revenue": round(q[3] or 0, 2)} for q in quarry_ranking]

    return {
        "mandal": mandal_name,
        "quarries": quarries_data
    }


@router.get("/leakage-report")
def get_leakage_report(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Detailed revenue leakage report.

    Lists every block where the weighbridge actual weight differs from the
    AI estimated weight by more than the configured threshold.

    Returns block-level detail with:
    - Block ID, quarry, district
    - AI estimated weight vs actual weighbridge weight
    - Variance % and raw difference in MT
    - Estimated revenue shortfall in rupees (if AI < actual, seigniorage was underpaid)
    - Estimated revenue surplus (if AI > actual, seigniorage was overpaid)

    No random values — all data from live DB.
    """
    if current_user.role not in ["admin", "dmgo", "enforcement"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    settings  = load_settings()
    threshold = settings.get("leakage_threshold_percent", 5.0)

    rows = (
        db.query(
            GraniteBlock,
            Measurement,
            Weighbridge,
            Seigniorage,
            Quarry,
        )
        .join(Measurement,  GraniteBlock.id == Measurement.block_id)
        .join(Weighbridge,  GraniteBlock.id == Weighbridge.block_id)
        .join(Seigniorage,  GraniteBlock.id == Seigniorage.block_id)
        .join(Quarry,       GraniteBlock.quarry_id == Quarry.id)
        .filter(Weighbridge.difference_percentage > threshold)
        .order_by(desc(Weighbridge.difference_percentage))
        .limit(limit)
        .all()
    )

    report = []
    total_leakage_inr = 0.0

    for block, meas, wb, seig, quarry in rows:
        ai_wt     = meas.estimated_weight
        actual_wt = wb.actual_weight
        diff_mt   = round(actual_wt - ai_wt, 3)  # + = underreported by AI, - = overreported
        rate      = seig.rate_per_mt

        # Revenue shortfall: if actual > AI, the AI underestimated → seigniorage shortfall
        # Revenue surplus:   if AI > actual, AI overestimated → overbilled (refund scenario)
        revenue_impact_inr = round(diff_mt * rate, 2)
        total_leakage_inr += max(0.0, revenue_impact_inr)  # Only count underreported as leakage

        report.append({
            "block_id":             block.id,
            "quarry":               quarry.name,
            "district":             quarry.district,
            "granite_type":         seig.granite_type,
            "ai_weight_mt":         round(ai_wt, 3),
            "actual_weight_mt":     round(actual_wt, 3),
            "difference_mt":        diff_mt,
            "variance_pct":         round(wb.difference_percentage, 2),
            "rate_per_mt_inr":      rate,
            "revenue_impact_inr":   revenue_impact_inr,
            "impact_type":          "SHORTFALL" if diff_mt > 0 else "SURPLUS",
            "weighbridge_status":   wb.status,
            "block_status":         block.status,
            "flagged_at":           wb.validation_time.isoformat() if wb.validation_time else None,
        })

    return {
        "threshold_pct":        threshold,
        "total_flagged_blocks": len(report),
        "total_leakage_inr":    round(total_leakage_inr, 2),
        "blocks":               report,
    }
