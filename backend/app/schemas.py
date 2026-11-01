from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str
    quarry_id: Optional[int] = None
    district: Optional[str] = None
    mandal: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# Quarry Schemas
class QuarryBase(BaseModel):
    name: str
    location_gps: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    mandal: Optional[str] = None
    mdl_number: Optional[str] = None
    lessee_id: Optional[str] = None
    owner_name: Optional[str] = None
    lease_validity: Optional[str] = None


class QuarryCreate(QuarryBase):
    pass

class QuarryResponse(QuarryBase):
    id: int

    class Config:
        from_attributes = True

# Image Schemas
class ImageResponse(BaseModel):
    id: int
    block_id: str
    file_path: str
    upload_time: datetime
    detection_status: bool
    confidence: float

    class Config:
        from_attributes = True

# Measurement Schemas
class MeasurementBase(BaseModel):
    length: float
    breadth: float
    height: float

class MeasurementCreate(MeasurementBase):
    pass

class MeasurementResponse(BaseModel):
    id: int
    block_id: str
    length: float
    breadth: float
    height: float
    volume: float
    estimated_weight: float
    
    # ── Phase 7 Volumes ──
    convex_hull_volume_m3: Optional[float] = None
    assumed_dressed_volume_m3: Optional[float] = None

    # Individual readings — department protocol (stored as JSON strings)
    length_readings: Optional[str] = None   # JSON "[L1, L2, L3, L4]" in cm
    breadth_readings: Optional[str] = None  # JSON "[B1, B2, B3, B4]" in cm
    height_readings: Optional[str] = None   # JSON "[H1, H2, H3, H4]" in cm
    # Measurement metadata
    measurement_method: Optional[str] = None   # "photogrammetry" | "gemini_multi_view" | "single_photo"
    photos_used: Optional[int] = None
    measurement_confidence: Optional[float] = None

    # ── Omni Calculator Cuboid Metrics ──
    # Ref: https://www.omnicalculator.com/math/cuboid-volume
    space_diagonal: Optional[float] = None     # Body/space diagonal in cm: sqrt(l^2 + b^2 + h^2)
    surface_area: Optional[float] = None       # Total surface area in m²: 2*(lb + lh + bh)/10000
    face_diagonal_lb: Optional[float] = None   # Base diagonal in cm: sqrt(l^2 + b^2)
    face_diagonal_lh: Optional[float] = None   # Length-height diagonal in cm: sqrt(l^2 + h^2)
    face_diagonal_bh: Optional[float] = None   # Breadth-height diagonal in cm: sqrt(b^2 + h^2)

    # ── Task 7.4 prototype edge quality (NOT statutory) ──────────────────────
    edge_measurement_method: Optional[str] = None
    edge_observation_quality: Optional[str] = None   # JSON string

    class Config:
        from_attributes = True


# Seigniorage Schemas
class SeigniorageResponse(BaseModel):
    id: int
    block_id: str
    granite_type: str
    government_category: Optional[str] = None
    rate_per_mt: float
    total_fee: float
    class_status: str

    class Config:
        from_attributes = True

# Weighbridge Schemas
class WeighbridgeCreate(BaseModel):
    actual_weight: float

class WeighbridgeResponse(BaseModel):
    id: int
    block_id: str
    actual_weight: float
    difference_percentage: float
    status: str
    validation_time: datetime
    operator_username: Optional[str] = None
    ai_estimated_weight: Optional[float] = None
    created_at: Optional[datetime] = None
    resolution_action: Optional[str] = None
    resolution_by: Optional[str] = None
    resolution_remarks: Optional[str] = None
    resolution_time: Optional[datetime] = None
    previous_weight: Optional[float] = None
    reweigh_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Dispatch Schemas
class DispatchCreate(BaseModel):
    vehicle_number: str
    driver_name: str
    destination: str
    e_permit_number: Optional[str] = None


class DispatchResponse(BaseModel):
    id: int
    block_id: str
    vehicle_number: str
    driver_name: str
    destination: str
    e_permit_number: Optional[str] = None
    transit_form_no: Optional[str] = None
    dispatch_time: datetime
    valid_until: Optional[datetime] = None


    class Config:
        from_attributes = True

# AuditLog Schemas
class AuditLogResponse(BaseModel):
    id: int
    block_id: Optional[str] = None
    event: str
    timestamp: datetime
    username: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True

# OMEPS Schemas
class OmepsSyncLogResponse(BaseModel):
    id: int
    block_id: str
    ai_volume: Optional[float] = None
    ai_weight: Optional[float] = None
    weighbridge_weight: Optional[float] = None
    dispatch_weight: Optional[float] = None
    difference: Optional[float] = None
    validation_status: Optional[str] = None
    sync_status: Optional[str] = None
    response: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# GraniteBlock Schemas
class GraniteBlockCreate(BaseModel):
    id: str
    quarry_id: int
    gps: Optional[str] = None

class GraniteBlockResponse(BaseModel):
    id: str
    quarry_id: int
    quarry_name: Optional[str] = None
    quarry_district: Optional[str] = None
    # Two-phase lifecycle
    block_type: Optional[str] = "dressed"          # 'undressed' | 'dressed'
    undressed_id: Optional[str] = None
    undressed_length: Optional[float] = None
    undressed_breadth: Optional[float] = None
    undressed_height: Optional[float] = None
    undressed_volume: Optional[float] = None
    # Status & lifecycle timestamps
    status: str
    gps: Optional[str] = None
    creation_time: datetime
    last_updated: datetime
    check_requested_at: Optional[datetime] = None
    check_requested_by: Optional[str] = None
    permit_ready_at: Optional[datetime] = None
    dmgo_remarks: Optional[str] = None
    approved_by: Optional[str] = None
    # Related objects
    images: List[ImageResponse] = []
    measurement: Optional[MeasurementResponse] = None
    seigniorage: Optional[SeigniorageResponse] = None
    weighbridge: Optional[WeighbridgeResponse] = None
    dispatch: Optional[DispatchResponse] = None

    # ── Volume Variance & Dressing Recovery Yield ──
    volume_difference: Optional[float] = None             # V_undressed - V_dressed (m³)
    volume_yield_percentage: Optional[float] = None       # (V_dressed / V_undressed) * 100 (%)
    volume_reduction_percentage: Optional[float] = None   # Trimming loss %

    class Config:
        from_attributes = True


# ── New request schemas for orientation-aligned workflow ─────────────────────

class UndressedBlockCreate(BaseModel):
    """Register a raw undressed granite block — single measurement per dimension."""
    quarry_id: int
    undressed_length: float   # largest edge length in cm
    undressed_breadth: float  # largest edge breadth in cm
    undressed_height: float   # largest edge height in cm
    gps: Optional[str] = None
    granite_type: Optional[str] = "Any Other Colour"
    length_readings: Optional[str] = None
    breadth_readings: Optional[str] = None
    height_readings: Optional[str] = None


class CheckMeasurementRequest(BaseModel):
    """Leaseholder raises a formal check measurement request to DMGO."""
    block_ids: List[str]      # one or more dressed block IDs
    remarks: Optional[str] = None


class DMGOVerifyWithMeasurements(BaseModel):
    """DMGO approves or modifies measurements — replaces manual check measurement."""
    action: str               # 'approve' | 'reject' | 'modify_approve'
    remarks: Optional[str] = None
    # Optional overrides — filled in when DMGO modifies the leaseholder's entry
    length: Optional[float] = None
    breadth: Optional[float] = None
    height: Optional[float] = None
    length_readings: Optional[str] = None   # JSON "[L1,L2,L3,L4]"
    breadth_readings: Optional[str] = None
    height_readings: Optional[str] = None
    granite_type: Optional[str] = None

class DashboardStats(BaseModel):
    total_blocks: int
    registered_blocks: int
    verified_blocks: int
    flagged_blocks: int
    dispatched_blocks: int
    total_volume: float
    total_seigniorage: float
    total_users: Optional[int] = 0
    total_audit_logs: Optional[int] = 0
    pending_review: Optional[int] = 0
    approved_blocks: Optional[int] = 0
    rejected_blocks: Optional[int] = 0
    dressed_blocks: Optional[int] = 0
    district_quarries: Optional[int] = 0
    granite_types: Optional[Dict[str, int]] = None


# Citizen Plan Schemas
class CitizenPlanCalculationRequest(BaseModel):
    granite_type: str
    monthly_tonnage: float
    duration_months: Optional[int] = 1
    billing_cycle: Optional[str] = "monthly"  # monthly, quarterly, annual
    delivery_district: Optional[str] = None

class CitizenPlanCalculationResponse(BaseModel):
    granite_type: str
    monthly_tonnage: float
    estimated_volume_m3: float
    duration_months: int
    billing_cycle: str
    base_rate_per_ton: float
    base_material_cost: float
    seigniorage_rate_per_m3: float
    seigniorage_fee: float
    dmf_rate_percent: float = 30.0
    dmf_amount: float
    cess_rate_percent: float = 2.0
    cess_amount: float
    transit_pass_fee: float
    total_monthly_amount: float
    total_period_amount: float
    savings_discount: float = 0.0

class CitizenPlanCreate(BaseModel):
    granite_type: str
    monthly_tonnage: float
    duration_months: Optional[int] = 1
    billing_cycle: Optional[str] = "monthly"
    delivery_district: Optional[str] = None

class CitizenPlanResponse(BaseModel):
    id: int
    plan_code: str
    user_id: int
    granite_type: str
    monthly_tonnage: float
    estimated_volume_m3: float
    duration_months: int
    billing_cycle: str
    base_rate_per_ton: float
    seigniorage_fee: float
    dmf_amount: float
    cess_amount: float
    transit_pass_fee: float
    total_monthly_amount: float
    status: str
    allocated_tonnage: float
    consumed_tonnage: float
    delivery_district: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CitizenDispatchQuotaRequest(BaseModel):
    tonnage: float
    destination_address: str
    vehicle_number: Optional[str] = None
    purpose: Optional[str] = "Residential / Commercial Construction"

