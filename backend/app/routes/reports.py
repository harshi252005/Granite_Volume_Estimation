from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime
import pandas as pd
import os

from ..database import get_db
from ..auth import RoleChecker, get_current_user
from ..models import User, GraniteBlock, Quarry, Measurement, Seigniorage

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("")
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        district = current_user.district or "Prakasam"

        # District-scoped query base
        base_q = db.query(GraniteBlock).join(Quarry, GraniteBlock.quarry_id == Quarry.id)
        if current_user.role == "dmgo" and current_user.district:
            base_q = base_q.filter(Quarry.district.ilike(current_user.district))

        # 1. Total summary
        total_blocks = base_q.count()
        total_revenue = db.query(func.sum(Seigniorage.total_fee))\
            .select_from(Seigniorage)\
            .join(GraniteBlock, Seigniorage.block_id == GraniteBlock.id)\
            .join(Quarry, GraniteBlock.quarry_id == Quarry.id)
        if current_user.role == "dmgo" and current_user.district:
            total_revenue = total_revenue.filter(Quarry.district.ilike(current_user.district))
        revenue_val = float(total_revenue.scalar() or 0.0)

        total_volume = db.query(func.sum(Measurement.volume))\
            .select_from(Measurement)\
            .join(GraniteBlock, Measurement.block_id == GraniteBlock.id)\
            .join(Quarry, GraniteBlock.quarry_id == Quarry.id)
        if current_user.role == "dmgo" and current_user.district:
            total_volume = total_volume.filter(Quarry.district.ilike(current_user.district))
        volume_val = float(total_volume.scalar() or 0.0)

        # 2. Above vs Below Gangsaw
        gangsaw_q = db.query(Seigniorage.class_status, func.count(Seigniorage.id))\
            .select_from(Seigniorage)\
            .join(GraniteBlock, Seigniorage.block_id == GraniteBlock.id)\
            .join(Quarry, GraniteBlock.quarry_id == Quarry.id)
        if current_user.role == "dmgo" and current_user.district:
            gangsaw_q = gangsaw_q.filter(Quarry.district.ilike(current_user.district))
        gangsaw_rows = gangsaw_q.group_by(Seigniorage.class_status).all()
        above_gangsaw = sum(r[1] for r in gangsaw_rows if r[0] and "above" in r[0].lower())
        below_gangsaw = sum(r[1] for r in gangsaw_rows if r[0] and "below" in r[0].lower())

        # 3. Dressed vs Undressed recovery
        undressed_count = base_q.filter(GraniteBlock.block_type == "undressed").count()
        dressed_count = base_q.filter(GraniteBlock.block_type == "dressed").count()

        # 4. Top Producing Quarries in District
        quarry_prod_q = db.query(
            Quarry.name,
            Quarry.mdl_number,
            func.count(GraniteBlock.id).label("block_count"),
            func.sum(Seigniorage.total_fee).label("seigniorage")
        ).select_from(GraniteBlock)\
         .join(Quarry, GraniteBlock.quarry_id == Quarry.id)\
         .outerjoin(Seigniorage, GraniteBlock.id == Seigniorage.block_id)
        if current_user.role == "dmgo" and current_user.district:
            quarry_prod_q = quarry_prod_q.filter(Quarry.district.ilike(current_user.district))
        quarry_prod = quarry_prod_q.group_by(Quarry.id)\
            .order_by(desc("block_count"))\
            .limit(8).all()

        top_quarries = [
            {
                "quarry_name": r[0],
                "mdl_number": r[1] or "—",
                "blocks": r[2],
                "seigniorage": round(float(r[3] or 0), 2)
            }
            for r in quarry_prod
        ]

        # 5. Monthly Trend (simulated from 2026 data)
        monthly_trend = [
            {"month": "Apr", "blocks": int(total_blocks * 0.12), "revenue": round(revenue_val * 0.11 / 100000, 2)},
            {"month": "May", "blocks": int(total_blocks * 0.15), "revenue": round(revenue_val * 0.14 / 100000, 2)},
            {"month": "Jun", "blocks": int(total_blocks * 0.18), "revenue": round(revenue_val * 0.17 / 100000, 2)},
            {"month": "Jul", "blocks": int(total_blocks * 0.16), "revenue": round(revenue_val * 0.16 / 100000, 2)},
            {"month": "Aug", "blocks": int(total_blocks * 0.20), "revenue": round(revenue_val * 0.22 / 100000, 2)},
            {"month": "Sep", "blocks": int(total_blocks * 0.19), "revenue": round(revenue_val * 0.20 / 100000, 2)},
        ]

        return {
            "district": district,
            "total_blocks": total_blocks,
            "total_revenue": revenue_val,
            "total_volume": round(volume_val, 3),
            "above_gangsaw": above_gangsaw,
            "below_gangsaw": below_gangsaw,
            "dressed_count": dressed_count,
            "undressed_count": undressed_count,
            "top_quarries": top_quarries,
            "monthly_trend": monthly_trend,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historical-permits")
def get_historical_permits(current_user: User = Depends(get_current_user)):
    try:
        file_path = os.path.join(os.getcwd(), 'datasets', 'permits_0.xls')
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dataset not found on the server.")
        df = pd.read_excel(file_path)
        df_clean = df.dropna(subset=['District Name'])
        grouped = df_clean.groupby('District Name')['Total Permits'].sum().reset_index()
        grouped = grouped.sort_values(by='Total Permits', ascending=False)
        results = []
        for index, row in grouped.iterrows():
            results.append({
                "name": row['District Name'],
                "permits": int(row['Total Permits'])
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

