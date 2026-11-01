from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Quarry, User
from ..schemas import QuarryCreate, QuarryResponse
from ..auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/quarries", tags=["Quarries"])

@router.get("/public", response_model=List[QuarryResponse])
def get_quarries_public(
    db: Session = Depends(get_db)
):
    """Public endpoint to list quarries - used during registration when no auth token is available"""
    return db.query(Quarry).all()

def generate_lessee_id(db: Session, district: str) -> str:
    # District mapping (01 to 13)
    districts = {
        "srikakulam": "01", "vizianagaram": "02", "visakhapatnam": "03",
        "east godavari": "04", "west godavari": "05", "krishna": "06",
        "guntur": "07", "prakasam": "08", "nellore": "09",
        "kadapa": "10", "kurnool": "11", "anantapur": "12", "chittoor": "13"
    }
    district_code = districts.get(district.lower() if district else "", "99")
    
    # Financial year code (e.g., 2425 for FY 2024-25)
    import datetime
    now = datetime.datetime.now()
    year = now.year % 100
    if now.month >= 4:
        fy_code = f"{year}{year+1:02d}"
    else:
        fy_code = f"{year-1:02d}{year}"
        
    # Sequence number
    count = db.query(Quarry).count()
    seq = f"{count + 1:04d}"
    
    return f"{district_code}{fy_code}{seq}"

@router.post("", response_model=QuarryResponse)
def create_quarry(
    quarry: QuarryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "dmgo"]))
):
    db_quarry = db.query(Quarry).filter(Quarry.name == quarry.name).first()
    if db_quarry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quarry name already exists"
        )
    
    # Generate LesseeID if not provided
    l_id = quarry.lessee_id if quarry.lessee_id else generate_lessee_id(db, quarry.district)
    
    new_quarry = Quarry(
        name=quarry.name,
        location_gps=quarry.location_gps,
        address=quarry.address,
        mdl_number=quarry.mdl_number,
        district=quarry.district,
        lessee_id=l_id
    )
    db.add(new_quarry)
    db.commit()
    db.refresh(new_quarry)
    return new_quarry

from typing import Optional

@router.get("", response_model=List[QuarryResponse])
def get_quarries(
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Quarry)
    if district and district.lower() != "all":
        query = query.filter(Quarry.district.ilike(district))
    elif current_user.role == "dmgo" and current_user.district and district != "all":
        query = query.filter(Quarry.district.ilike(current_user.district))
    return query.order_by(Quarry.name.asc()).all()

