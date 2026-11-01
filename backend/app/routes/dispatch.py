from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
# pyrefly: ignore [missing-import]
from ..database import get_db
# pyrefly: ignore [missing-import]
from ..models import GraniteBlock, Dispatch, AuditLog, User
# pyrefly: ignore [missing-import]
from ..schemas import DispatchResponse
# pyrefly: ignore [missing-import]
from ..auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/dispatch", tags=["Dispatch Management"])

@router.get("", response_model=List[DispatchResponse])
def get_all_dispatches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Dispatch).order_by(Dispatch.id.desc()).limit(200).all()

@router.get("/{block_id}", response_model=DispatchResponse)
def get_dispatch_record(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(Dispatch).filter(Dispatch.block_id == block_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    return record

def _parse_valid_until(valid_until: Optional[str], validity_hours: Optional[int]) -> datetime:
    if valid_until:
        try:
            from dateutil import parser
            return parser.parse(valid_until)
        except Exception:
            try:
                return datetime.fromisoformat(valid_until.replace("Z", "+00:00"))
            except Exception:
                pass
    hours = validity_hours if validity_hours else 48
    return datetime.utcnow() + timedelta(hours=int(hours))

def generate_transit_ids(db: Session, block: GraniteBlock):
    # Get quarry lessee ID
    quarry = block.quarry
    l_id = quarry.lessee_id if quarry and quarry.lessee_id else "9999999999"
    
    # Sequence for this quarry's permits
    q_count = db.query(Dispatch).join(GraniteBlock).filter(GraniteBlock.quarry_id == quarry.id).count()
    permit_no = f"PR{l_id}{q_count + 1:04d}"
    
    # Global sequence for transit forms
    global_count = db.query(Dispatch).count()
    now = datetime.utcnow()
    year = now.year % 100
    base = f"01{year:02d}"
    transit_no = f"TRANSIT{base}{global_count + 1:06d}"
    
    return permit_no, transit_no

@router.post("/{block_id}/issue-pass", response_model=DispatchResponse)
def issue_transit_pass(
    block_id: str,
    vehicle_number: str = Form(...),
    driver_name: str = Form(...),
    destination: str = Form(...),
    valid_until: Optional[str] = Form(None),
    validity_hours: Optional[int] = Form(None),
    e_permit_number: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["dmgo", "operator", "admin"]))
):
    """
    Statutory e-Transit Pass issuance endpoint.
    Executed when DMGO officer authorizes a transit permit for an approved block.
    Stores vehicle registration number, driver name, destination, and validity duration.
    Sets block status to 'permit_ready' so operator automatically receives the sealed permit.
    """
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Granite block not found"
        )

    permit_no, transit_no = generate_transit_ids(db, block)
    final_permit = e_permit_number if e_permit_number else permit_no
    final_valid_until = _parse_valid_until(valid_until, validity_hours)

    dispatch_record = db.query(Dispatch).filter(Dispatch.block_id == block_id).first()
    if dispatch_record:
        dispatch_record.vehicle_number = vehicle_number.strip().upper()
        dispatch_record.driver_name = driver_name.strip()
        dispatch_record.destination = destination.strip()
        dispatch_record.e_permit_number = final_permit
        dispatch_record.valid_until = final_valid_until
        # NOTE: dispatch_time is intentionally NOT set here.
        # dispatch_time must only be written when the operator explicitly confirms dispatch.
        if not dispatch_record.transit_form_no:
            dispatch_record.transit_form_no = transit_no
    else:
        dispatch_record = Dispatch(
            block_id=block_id,
            vehicle_number=vehicle_number.strip().upper(),
            driver_name=driver_name.strip(),
            destination=destination.strip(),
            e_permit_number=final_permit,
            transit_form_no=transit_no,
            # dispatch_time is intentionally NOT set here — set only on operator confirm
            valid_until=final_valid_until,
        )
        db.add(dispatch_record)

    block.status = "permit_ready"
    block.permit_ready_at = datetime.utcnow()

    db_audit = AuditLog(
        block_id=block_id,
        event="e-Transit Pass Issued by DMGO",
        username=current_user.username,
        details=f"Statutory e-Transit Pass issued. Vehicle: {vehicle_number.strip().upper()} | Driver: {driver_name.strip()} | Destination: {destination.strip()} | Valid Until: {final_valid_until.strftime('%d/%m/%Y %H:%M')} | e-Permit: {final_permit}."
    )
    db.add(db_audit)

    # Simulate OMEPS 2.0 synchronization
    volume_shared = block.measurement.volume if block.measurement else 0.0
    weight_shared = block.weighbridge.actual_weight if block.weighbridge else (block.measurement.estimated_weight if block.measurement else 0.0)
    fee_shared = block.seigniorage.total_fee if block.seigniorage else 0.0

    db_omeps_sync = AuditLog(
        block_id=block_id,
        event="OMEPS 2.0 Integration Sync",
        username="SYSTEM",
        details=f"Data pushed to OMEPS: Volume: {volume_shared} m3, Weight: {weight_shared} MT, Seigniorage Fee: Rs. {fee_shared}, e-Permit: {final_permit}. Status: SYNCHRONIZED."
    )
    db.add(db_omeps_sync)

    db.commit()
    db.refresh(dispatch_record)
    return dispatch_record

@router.post("/{block_id}", response_model=DispatchResponse)
def dispatch_block(
    block_id: str,
    vehicle_number: str = Form(...),
    driver_name: str = Form(...),
    destination: str = Form(...),
    e_permit_number: Optional[str] = Form(None),
    valid_until: Optional[str] = Form(None),
    validity_hours: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["operator", "dmgo", "admin"]))
):
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Granite block not found"
        )
        
    permit_no, transit_no = generate_transit_ids(db, block)
    final_permit = e_permit_number if e_permit_number else permit_no
    final_valid_until = _parse_valid_until(valid_until, validity_hours)
        
    dispatch_record = db.query(Dispatch).filter(Dispatch.block_id == block_id).first()
    if dispatch_record:
        dispatch_record.vehicle_number = vehicle_number.strip().upper()
        dispatch_record.driver_name = driver_name.strip()
        dispatch_record.destination = destination.strip()
        dispatch_record.e_permit_number = final_permit
        dispatch_record.valid_until = final_valid_until
        if not dispatch_record.transit_form_no:
            dispatch_record.transit_form_no = transit_no
    else:
        dispatch_record = Dispatch(
            block_id=block_id,
            vehicle_number=vehicle_number.strip().upper(),
            driver_name=driver_name.strip(),
            destination=destination.strip(),
            e_permit_number=final_permit,
            transit_form_no=transit_no,
            valid_until=final_valid_until
        )
        db.add(dispatch_record)
        
    if current_user.role == "dmgo":
        block.status = "permit_ready"
        block.permit_ready_at = datetime.utcnow()
        event_name = "e-Transit Pass Issued by DMGO"
        details_msg = f"DMGO {current_user.username} issued transit pass. Driver: {driver_name} | Vehicle: {vehicle_number} | Destination: {destination} | Valid Until: {final_valid_until.strftime('%d/%m/%Y %H:%M')}."
    else:
        # Operator confirm-dispatch: only allowed when weighbridge is done (weighbridge_approved) or permit is ready
        allowed_statuses = ["permit_ready", "weighbridge_approved"]
        if block.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot dispatch: block status is '{block.status}'. Weighbridge assessment must be completed and permit must be ready before operator can dispatch."
            )
        # Set dispatch_time NOW — this is the actual moment the vehicle leaves
        if dispatch_record:
            dispatch_record.dispatch_time = datetime.utcnow()
        block.status = "dispatched"
        event_name = "Transport Dispatched by Operator"
        details_msg = f"Operator {current_user.username} confirmed dispatch. Driver: {driver_name} | Vehicle: {vehicle_number} | Destination: {destination} | e-Permit: {final_permit}."
    
    # Audit trail entry for dispatch logistics
    db_audit = AuditLog(
        block_id=block_id,
        event=event_name,
        username=current_user.username,
        details=details_msg
    )
    db.add(db_audit)
    
    # Simulate OMEPS 2.0 synchronization (Step 11 in workflow)
    volume_shared = block.measurement.volume if block.measurement else 0.0
    weight_shared = block.weighbridge.actual_weight if block.weighbridge else (block.measurement.estimated_weight if block.measurement else 0.0)
    fee_shared = block.seigniorage.total_fee if block.seigniorage else 0.0
    
    db_omeps_sync = AuditLog(
        block_id=block_id,
        event="OMEPS 2.0 Integration Sync",
        username="SYSTEM",
        details=f"Data pushed to OMEPS: Volume: {volume_shared} m3, Weight: {weight_shared} MT, Seigniorage Fee: Rs. {fee_shared}, e-Permit: {final_permit}. Status: SYNCHRONIZED."
    )
    db.add(db_omeps_sync)
    
    db.commit()
    db.refresh(dispatch_record)
    return dispatch_record

@router.post("/{block_id}/receive", response_model=DispatchResponse)
def receive_block(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["operator", "admin", "citizen"]))
):
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Granite block not found"
        )
        
    dispatch_record = db.query(Dispatch).filter(Dispatch.block_id == block_id).first()
    if not dispatch_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Block has not been dispatched yet"
        )
        
    block.status = "delivered"
    
    db_audit = AuditLog(
        block_id=block_id,
        event="Delivery Confirmed by Citizen Receiver",
        username=current_user.username,
        details=f"Block delivery confirmed at destination ({dispatch_record.destination}) by {current_user.username} ({current_user.full_name or 'Citizen Buyer'})."
    )
    db.add(db_audit)
    db.commit()
    db.refresh(dispatch_record)
    return dispatch_record

@router.get("/{block_id}/transit-track")
def track_transit(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["operator", "dmgo", "admin", "citizen", "enforcement"]))
):
    block = db.query(GraniteBlock).filter(GraniteBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Granite block not found"
        )
        
    dispatch_record = db.query(Dispatch).filter(Dispatch.block_id == block_id).first()
    if not dispatch_record or not dispatch_record.dispatch_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Block has not been dispatched yet"
        )
        
    # Simulate tracking based on time elapsed since dispatch
    now = datetime.utcnow()
    elapsed_minutes = (now - dispatch_record.dispatch_time).total_seconds() / 60.0
    
    # Define route checkpoints (simulated AP highway journey)
    checkpoints = [
        {"id": 1, "name": "Quarry Origin", "type": "origin", "minutes_from_start": 0},
        {"id": 2, "name": "Mandal Checkpost", "type": "checkpoint", "minutes_from_start": 15},
        {"id": 3, "name": "District Border Toll", "type": "toll", "minutes_from_start": 60},
        {"id": 4, "name": "State Highway 42 Weighbridge", "type": "weighbridge", "minutes_from_start": 120},
        {"id": 5, "name": f"Destination: {dispatch_record.destination}", "type": "destination", "minutes_from_start": 240}
    ]
    
    current_location = "Quarry"
    progress_percentage = min(100, int((elapsed_minutes / 240.0) * 100))
    status_label = "In Transit"
    
    if block.status in ["delivered", "received"] or elapsed_minutes >= 240:
        status_label = "Delivered" if block.status in ["delivered", "received"] else "Arrived"
        current_location = dispatch_record.destination
        progress_percentage = 100
        if block.status not in ["delivered", "received"]:
            block.status = "delivered"
            db_audit = AuditLog(
                block_id=block_id,
                event="Delivery Confirmed",
                username="System",
                details=f"Block delivery auto-confirmed at destination: {dispatch_record.destination}."
            )
            db.add(db_audit)
            db.commit()
            
        for cp in checkpoints:
            cp["status"] = "passed"
            cp["timestamp"] = (dispatch_record.dispatch_time + __import__('datetime').timedelta(minutes=cp["minutes_from_start"])).isoformat()
            
        return {
            "block_id": block_id,
            "vehicle_number": dispatch_record.vehicle_number,
            "driver_name": dispatch_record.driver_name,
            "destination": dispatch_record.destination,
            "dispatch_time": dispatch_record.dispatch_time.isoformat(),
            "current_status": status_label,
            "current_location": current_location,
            "progress_percentage": progress_percentage,
            "checkpoints": checkpoints
        }
    
    # Mark checkpoints as passed/upcoming
    for cp in checkpoints:
        if elapsed_minutes >= cp["minutes_from_start"]:
            cp["status"] = "passed"
            cp["timestamp"] = (dispatch_record.dispatch_time + __import__('datetime').timedelta(minutes=cp["minutes_from_start"])).isoformat()
            current_location = cp["name"]
        else:
            cp["status"] = "upcoming"
            cp["eta"] = (dispatch_record.dispatch_time + __import__('datetime').timedelta(minutes=cp["minutes_from_start"])).isoformat()
            
    return {
        "block_id": block_id,
        "vehicle_number": dispatch_record.vehicle_number,
        "driver_name": dispatch_record.driver_name,
        "destination": dispatch_record.destination,
        "dispatch_time": dispatch_record.dispatch_time.isoformat(),
        "current_status": status_label,
        "current_location": current_location,
        "progress_percentage": progress_percentage,
        "checkpoints": checkpoints
    }
