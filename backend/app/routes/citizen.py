import random
import string
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# pyrefly: ignore [missing-import]
from ..database import get_db 
# pyrefly: ignore [missing-import]
from ..models import User, CitizenPlan, GraniteBlock
# pyrefly: ignore [missing-import]
from ..schemas import (
    CitizenPlanCalculationRequest,
    CitizenPlanCalculationResponse,
    CitizenPlanCreate,
    CitizenPlanResponse,
    CitizenDispatchQuotaRequest,
)
# pyrefly: ignore [missing-import]
from ..auth import get_current_user

router = APIRouter(prefix="/api/citizen", tags=["Citizen Portal"])

# APMMCR 1966 Statutory Seigniorage & Market Benchmark Rates
# Granite density standard in AP: 2.75 Metric Tonnes per m3
DENSITY_T_PER_M3 = 2.75

GRANITE_CONFIG = {
    "Black Galaxy Granite": {
        "description": "World-renowned star-galaxy flecked black granite from Chimakurthy, Prakasam district",
        "seigniorage_per_m3": 3975.0,  # Official APMMCR Gazette rate
        "base_rate_per_ton": 7500.0,
        "mining_hubs": ["Chimakurthy", "Prakasam", "Ballikurava"],
        "color_code": "#1A1A24",
        "badge": "AP GI Tagged / Premium Export",
        "recommended_thickness": "18mm - 30mm",
    },
    "Black Granite": {
        "description": "Jet black and dense absolute black granite suited for memorials, facades, and premium interiors",
        "seigniorage_per_m3": 3315.0,
        "base_rate_per_ton": 5800.0,
        "mining_hubs": ["Kanigiri", "Prakasam", "Chittoor"],
        "color_code": "#2C3437",
        "badge": "High Tensile / Monument Grade",
        "recommended_thickness": "20mm - 40mm",
    },
    "Premium Colour Granite": {
        "description": "Rich Kashmir White, Kuppam Green, Steel Grey, and Srikakulam Blue silk varieties",
        "seigniorage_per_m3": 2650.0,
        "base_rate_per_ton": 4600.0,
        "mining_hubs": ["Kuppam", "Chittoor", "Tekkali", "Srikakulam"],
        "color_code": "#4A6572",
        "badge": "Luxury Architectural Grade",
        "recommended_thickness": "18mm - 25mm",
    },
    "Standard Colour Granite": {
        "description": "Popular granite textures including P-White, Visakha Brown, and Multi-colour patterns",
        "seigniorage_per_m3": 2315.0,
        "base_rate_per_ton": 3800.0,
        "mining_hubs": ["Ananthapuramu", "Guntur", "Palnadu"],
        "color_code": "#8D6E63",
        "badge": "Residential & Flooring Grade",
        "recommended_thickness": "15mm - 20mm",
    },
    "Other Colour Granite": {
        "description": "Commercial building granite slabs, curbing blocks, and heavy structural stone",
        "seigniorage_per_m3": 1990.0,
        "base_rate_per_ton": 3200.0,
        "mining_hubs": ["Rayachoty", "Kadapa", "Kurnool"],
        "color_code": "#78909C",
        "badge": "Commercial / Civil Grade",
        "recommended_thickness": "20mm - 50mm",
    },
}

def generate_plan_code() -> str:
    suffix = "".join(random.choices(string.digits, k=6))
    return f"AP-CIT-{suffix}"

def compute_plan_financials(
    granite_type: str,
    monthly_tonnage: float,
    duration_months: int = 1,
    billing_cycle: str = "monthly",
) -> Dict:
    matched_key = None
    for k in GRANITE_CONFIG.keys():
        if k.lower() == granite_type.strip().lower():
            matched_key = k
            break

    if not matched_key:
        # fallback to standard colour if unknown
        matched_key = "Standard Colour Granite"

    cfg = GRANITE_CONFIG[matched_key]
    weight_mt = max(0.5, float(monthly_tonnage))
    volume_m3 = round(weight_mt / DENSITY_T_PER_M3, 3)

    base_material_cost = round(weight_mt * cfg["base_rate_per_ton"], 2)
    seigniorage_fee = round(volume_m3 * cfg["seigniorage_per_m3"], 2)
    dmf_amount = round(seigniorage_fee * 0.30, 2)  # 30% DMF under APMMCR
    cess_amount = round(seigniorage_fee * 0.02, 2)  # 2% Mineral Investigation Cess
    transit_pass_fee = round(weight_mt * 150.0, 2)  # ₹150 / MT e-Permit Transit Fee

    gross_monthly = round(
        base_material_cost + seigniorage_fee + dmf_amount + cess_amount + transit_pass_fee,
        2,
    )

    discount_pct = 0.0
    if billing_cycle == "quarterly":
        discount_pct = 5.0
    elif billing_cycle == "annual":
        discount_pct = 10.0

    discount_amount = round(gross_monthly * (discount_pct / 100.0), 2)
    net_monthly = round(gross_monthly - discount_amount, 2)
    total_period = round(net_monthly * max(1, duration_months), 2)

    return {
        "granite_type": matched_key,
        "monthly_tonnage": weight_mt,
        "estimated_volume_m3": volume_m3,
        "duration_months": duration_months,
        "billing_cycle": billing_cycle,
        "base_rate_per_ton": cfg["base_rate_per_ton"],
        "base_material_cost": base_material_cost,
        "seigniorage_rate_per_m3": cfg["seigniorage_per_m3"],
        "seigniorage_fee": seigniorage_fee,
        "dmf_rate_percent": 30.0,
        "dmf_amount": dmf_amount,
        "cess_rate_percent": 2.0,
        "cess_amount": cess_amount,
        "transit_pass_fee": transit_pass_fee,
        "total_monthly_amount": net_monthly,
        "total_period_amount": total_period,
        "savings_discount": discount_amount,
    }


@router.get("/granite-types")
def get_granite_types():
    """Return available AP granite types and statutory pricing metadata."""
    types_list = []
    for name, info in GRANITE_CONFIG.items():
        types_list.append({
            "name": name,
            "seigniorage_per_m3": info["seigniorage_per_m3"],
            "base_rate_per_ton": info["base_rate_per_ton"],
            "description": info["description"],
            "mining_hubs": info["mining_hubs"],
            "color_code": info["color_code"],
            "badge": info["badge"],
            "recommended_thickness": info["recommended_thickness"],
            "density_t_per_m3": DENSITY_T_PER_M3,
        })
    return types_list


@router.post("/calculate", response_model=CitizenPlanCalculationResponse)
def calculate_plan_estimate(payload: CitizenPlanCalculationRequest):
    """Estimate monthly plan costs, seigniorage, and statutory DMF/Cess breakdown."""
    fin = compute_plan_financials(
        granite_type=payload.granite_type,
        monthly_tonnage=payload.monthly_tonnage,
        duration_months=payload.duration_months or 1,
        billing_cycle=payload.billing_cycle or "monthly",
    )
    return fin


@router.get("/plans", response_model=List[CitizenPlanResponse])
def get_user_citizen_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all monthly granite subscription plans for current user or citizen."""
    if current_user.role in ["admin", "dmgo"]:
        return db.query(CitizenPlan).order_by(CitizenPlan.created_at.desc()).all()
    return (
        db.query(CitizenPlan)
        .filter(CitizenPlan.user_id == current_user.id)
        .order_by(CitizenPlan.created_at.desc())
        .all()
    )


@router.post("/plans", response_model=CitizenPlanResponse, status_code=status.HTTP_201_CREATED)
def create_citizen_plan(
    payload: CitizenPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Subscribe to a new monthly granite plan customized by granite type and tonnage."""
    fin = compute_plan_financials(
        granite_type=payload.granite_type,
        monthly_tonnage=payload.monthly_tonnage,
        duration_months=payload.duration_months or 1,
        billing_cycle=payload.billing_cycle or "monthly",
    )

    plan_code = generate_plan_code()
    # Check uniqueness
    while db.query(CitizenPlan).filter(CitizenPlan.plan_code == plan_code).first():
        plan_code = generate_plan_code()

    start_date = datetime.utcnow()
    duration_days = 30 * (payload.duration_months or 1)
    end_date = start_date + timedelta(days=duration_days)

    total_allocated = float(payload.monthly_tonnage) * float(payload.duration_months or 1)

    new_plan = CitizenPlan(
        plan_code=plan_code,
        user_id=current_user.id,
        granite_type=fin["granite_type"],
        monthly_tonnage=fin["monthly_tonnage"],
        estimated_volume_m3=fin["estimated_volume_m3"],
        duration_months=fin["duration_months"],
        billing_cycle=fin["billing_cycle"],
        base_rate_per_ton=fin["base_rate_per_ton"],
        seigniorage_fee=fin["seigniorage_fee"],
        dmf_amount=fin["dmf_amount"],
        cess_amount=fin["cess_amount"],
        transit_pass_fee=fin["transit_pass_fee"],
        total_monthly_amount=fin["total_monthly_amount"],
        status="ACTIVE",
        allocated_tonnage=total_allocated,
        consumed_tonnage=0.0,
        delivery_district=payload.delivery_district or current_user.district or "Prakasam",
        start_date=start_date,
        end_date=end_date,
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan


@router.get("/plans/{plan_id}", response_model=CitizenPlanResponse)
def get_single_citizen_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(CitizenPlan).filter(CitizenPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if current_user.role not in ["admin", "dmgo"] and plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this plan")
    return plan


@router.patch("/plans/{plan_id}/status", response_model=CitizenPlanResponse)
def update_plan_status(
    plan_id: int,
    new_status: str,  # ACTIVE, PAUSED, CANCELLED
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(CitizenPlan).filter(CitizenPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if current_user.role not in ["admin", "dmgo"] and plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to modify this plan")

    valid_statuses = ["ACTIVE", "PAUSED", "CANCELLED"]
    if new_status.upper() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from {valid_statuses}")

    plan.status = new_status.upper()
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/plans/{plan_id}/dispatch")
def request_dispatch_quota(
    plan_id: int,
    payload: CitizenDispatchQuotaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request stone dispatch against an active monthly quota."""
    plan = db.query(CitizenPlan).filter(CitizenPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if current_user.role not in ["admin", "dmgo"] and plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to dispatch from this plan")

    if plan.status != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Cannot dispatch from plan in {plan.status} status")

    remaining_tonnage = plan.allocated_tonnage - plan.consumed_tonnage
    if payload.tonnage <= 0:
        raise HTTPException(status_code=400, detail="Requested tonnage must be greater than 0")

    if payload.tonnage > remaining_tonnage:
        raise HTTPException(
            status_code=400,
            detail=f"Requested tonnage ({payload.tonnage} MT) exceeds available quota ({remaining_tonnage:.2f} MT)",
        )

    plan.consumed_tonnage = round(plan.consumed_tonnage + payload.tonnage, 2)
    db.commit()
    db.refresh(plan)

    dispatch_ref = f"DSP-CIT-{''.join(random.choices(string.digits, k=5))}"

    return {
        "message": "Dispatch quota order approved successfully",
        "dispatch_reference": dispatch_ref,
        "plan_code": plan.plan_code,
        "granite_type": plan.granite_type,
        "dispatched_tonnage": payload.tonnage,
        "remaining_tonnage": round(plan.allocated_tonnage - plan.consumed_tonnage, 2),
        "destination_address": payload.destination_address,
        "vehicle_number": payload.vehicle_number or "ALLOCATED-BY-TRANSPORTER",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "DISPATCH_AUTHORIZED",
    }
