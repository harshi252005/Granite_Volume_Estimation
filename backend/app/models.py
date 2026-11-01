from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)  # operator, dmgo, weighbridge, admin
    full_name = Column(String(255), nullable=True)
    quarry_id = Column(Integer, ForeignKey("quarries.id"), nullable=True)
    district = Column(String(255), nullable=True)  # added for DMGO district scope
    mandal = Column(String(255), nullable=True)  # added for Mandal scope

    quarry = relationship("Quarry", back_populates="users")

class Quarry(Base):
    __tablename__ = "quarries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    location_gps = Column(String(255), nullable=True)  # "lat,lng" format
    address = Column(String(255), nullable=True)
    district = Column(String(255), nullable=True)  # added for district grouping
    mandal = Column(String(255), nullable=True)  # added for mandal grouping
    mdl_number = Column(String(255), nullable=True)  # Mineral Dealer License
    lessee_id = Column(String(255), unique=True, nullable=True)  # 10-digit Lessee ID (e.g., 1021220637)
    owner_name = Column(String(255), nullable=True)
    lease_validity = Column(String(255), nullable=True)

    users = relationship("User", back_populates="quarry")
    blocks = relationship("GraniteBlock", back_populates="quarry")

class GraniteBlock(Base):
    __tablename__ = "granite_blocks"

    id = Column(String(255), primary_key=True, index=True)  # e.g., "GB001"
    quarry_id = Column(Integer, ForeignKey("quarries.id"), nullable=False)

    # ── Two-phase block lifecycle (per AP DMG orientation) ────────────────────
    # block_type: 'undressed' = raw block (single measurement), 'dressed' = cut block (4-reading)
    block_type = Column(String(50), default="dressed")

    # Undressed block — single measurement (largest L, B, H per officer's estimate)
    undressed_id      = Column(String(255), nullable=True)   # e.g., "UD-BLK20250817-001"
    undressed_length  = Column(Float, nullable=True)          # cm
    undressed_breadth = Column(Float, nullable=True)          # cm
    undressed_height  = Column(Float, nullable=True)          # cm
    undressed_volume  = Column(Float, nullable=True)          # m³

    # Status flow: undressed → dressed → check_requested → dmgo_approved|dmgo_rejected → permit_ready
    status = Column(String(255), default="dressed")

    gps = Column(String(255), nullable=True)
    creation_time = Column(DateTime, default=datetime.utcnow)
    last_updated  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by   = Column(String(255), nullable=True)

    # ── Check Measurement Request tracking ───────────────────────────────────
    check_requested_at = Column(DateTime, nullable=True)
    check_requested_by = Column(String(255), nullable=True)

    # ── Post-approval ─────────────────────────────────────────────────────────
    permit_ready_at = Column(DateTime, nullable=True)
    dmgo_remarks    = Column(String(1024), nullable=True)

    quarry    = relationship("Quarry", back_populates="blocks")
    images    = relationship("Image",        back_populates="block", cascade="all, delete-orphan")
    measurement = relationship("Measurement",  back_populates="block", uselist=False, cascade="all, delete-orphan")
    seigniorage = relationship("Seigniorage",  back_populates="block", uselist=False, cascade="all, delete-orphan")
    weighbridge = relationship("Weighbridge",  back_populates="block", uselist=False, cascade="all, delete-orphan")
    dispatch    = relationship("Dispatch",     back_populates="block", uselist=False, cascade="all, delete-orphan")
    audit_logs  = relationship("AuditLog",    back_populates="block", cascade="all, delete-orphan")

    # ── Volume Variance & Dressing Yield Properties ───────────────────────────
    @property
    def volume_difference(self):
        """
        Difference in volume between raw undressed block and cut dressed block:
        Delta V = V_undressed - V_dressed (m³)
        """
        if self.undressed_volume is not None and self.measurement and self.measurement.volume is not None:
            return round(float(self.undressed_volume) - float(self.measurement.volume), 4)
        return None

    @property
    def volume_yield_percentage(self):
        """
        Dressing recovery yield: (V_dressed / V_undressed) * 100 (%)
        """
        if self.undressed_volume and self.measurement and self.measurement.volume and float(self.undressed_volume) > 0:
            return round((float(self.measurement.volume) / float(self.undressed_volume)) * 100.0, 1)
        return None

    @property
    def volume_reduction_percentage(self):
        """
        Trimming scrap loss percentage: ((V_undressed - V_dressed) / V_undressed) * 100 (%)
        """
        if self.undressed_volume and self.measurement and self.measurement.volume and float(self.undressed_volume) > 0:
            diff = float(self.undressed_volume) - float(self.measurement.volume)
            return round((diff / float(self.undressed_volume)) * 100.0, 1)
        return None


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    detection_status = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)

    block = relationship("GraniteBlock", back_populates="images")

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=False, unique=True)
    length = Column(Float, nullable=False)  # in cm (average of L1-L4)
    breadth = Column(Float, nullable=False)  # in cm (average of B1-B4)
    height = Column(Float, nullable=False)  # in cm (average of H1-H4)
    volume = Column(Float, nullable=False)  # in cubic meters
    estimated_weight = Column(Float, nullable=False)  # in Metric Tons (MT)

    # ── Phase 7 Volumes ───────────────────────────────────────────────────────
    convex_hull_volume_m3 = Column(Float, nullable=True)
    assumed_dressed_volume_m3 = Column(Float, nullable=True)

    # ── Individual readings — matches department measurement protocol ──────────
    # Stored as JSON strings e.g. "[280.1, 279.8, 280.4, 279.9]"
    length_readings  = Column(Text, nullable=True)   # [L1, L2, L3, L4] in cm
    breadth_readings = Column(Text, nullable=True)   # [B1, B2, B3, B4] in cm
    height_readings  = Column(Text, nullable=True)   # [H1, H2, H3, H4] in cm

    # ── Measurement metadata ──────────────────────────────────────────────────
    measurement_method = Column(String(50), nullable=True, default="single_photo")
    # Values: "photogrammetry" | "gemini_multi_view" | "single_photo"
    photos_used = Column(Integer, nullable=True, default=1)
    # Reconstruction confidence score 0-100
    measurement_confidence = Column(Float, nullable=True)

    # ── Task 7.4 prototype edge measurement metadata (NOT statutory) ──────────
    # Populated only by walkaround_3d; None for all Mode A records.
    edge_measurement_method = Column(String(80), nullable=True)
    # JSON: {"face_quality": {...}, "axis_quality": {...}, "n_good_faces": N}
    edge_observation_quality = Column(Text, nullable=True)

    block = relationship("GraniteBlock", back_populates="measurement")

    # ── Omni Calculator Cuboid Properties ─────────────────────────────────────
    # Ref: https://www.omnicalculator.com/math/cuboid-volume
    @property
    def space_diagonal(self):
        """
        Space diagonal (body diagonal) of cuboid:
        d = sqrt(l^2 + b^2 + h^2) in cm
        """
        if self.length is not None and self.breadth is not None and self.height is not None:
            import math
            return round(math.sqrt(float(self.length)**2 + float(self.breadth)**2 + float(self.height)**2), 2)
        return None

    @property
    def face_diagonal_lb(self):
        """Base face diagonal (Length-Breadth): sqrt(l^2 + b^2) in cm"""
        if self.length is not None and self.breadth is not None:
            import math
            return round(math.sqrt(float(self.length)**2 + float(self.breadth)**2), 2)
        return None

    @property
    def face_diagonal_lh(self):
        """Side face diagonal (Length-Height): sqrt(l^2 + h^2) in cm"""
        if self.length is not None and self.height is not None:
            import math
            return round(math.sqrt(float(self.length)**2 + float(self.height)**2), 2)
        return None

    @property
    def face_diagonal_bh(self):
        """Front face diagonal (Breadth-Height): sqrt(b^2 + h^2) in cm"""
        if self.breadth is not None and self.height is not None:
            import math
            return round(math.sqrt(float(self.breadth)**2 + float(self.height)**2), 2)
        return None

    @property
    def surface_area(self):
        """
        Total surface area of cuboid in m²:
        A = 2 * (l*b + l*h + b*h) / 10,000
        """
        if self.length is not None and self.breadth is not None and self.height is not None:
            l, b, h = float(self.length), float(self.breadth), float(self.height)
            area_cm2 = 2.0 * (l * b + l * h + b * h)
            return round(area_cm2 / 10000.0, 4)
        return None

class Seigniorage(Base):
    __tablename__ = "seigniorage"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=False, unique=True)
    granite_type = Column(String(255), nullable=False)
    government_category = Column(String(255), nullable=True)
    rate_per_mt = Column(Float, nullable=False)
    total_fee = Column(Float, nullable=False)
    class_status = Column(String(255), nullable=False)  # above_gangsaw, below_gangsaw

    block = relationship("GraniteBlock", back_populates="seigniorage")

class Weighbridge(Base):
    __tablename__ = "weighbridge"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=False, unique=True)
    actual_weight = Column(Float, nullable=False)
    difference_percentage = Column(Float, nullable=False)
    status = Column(String(255), nullable=False)  # approved, flagged, reweighed, dmgo_override, escalated
    validation_time = Column(DateTime, default=datetime.utcnow)
    operator_username = Column(String(255), nullable=True)

    # ── Resolution tracking (populated when a flagged block is resolved) ───────
    resolution_action   = Column(String(50),   nullable=True)   # "reweigh" | "dmgo_override" | "escalated"
    resolution_by       = Column(String(255),  nullable=True)   # username who resolved
    resolution_remarks  = Column(Text,         nullable=True)   # DMGO remarks / reason
    resolution_time     = Column(DateTime,     nullable=True)   # when was it resolved
    previous_weight     = Column(Float,        nullable=True)   # original weight before re-weigh
    reweigh_count       = Column(Integer,      default=0)       # how many times re-weighed

    block = relationship("GraniteBlock", back_populates="weighbridge")

class Dispatch(Base):
    __tablename__ = "dispatch"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=False, unique=True)
    vehicle_number = Column(String(255), nullable=False)
    driver_name = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    e_permit_number = Column(String(255), nullable=True)  # OMEPS e-Permit
    transit_form_no = Column(String(255), unique=True, nullable=True)  # Auto-generated 10-digit sequence
    dispatch_time = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)


    block = relationship("GraniteBlock", back_populates="dispatch")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=True)
    event = Column(String(255), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    username = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)

    block = relationship("GraniteBlock", back_populates="audit_logs")

class OmepsSyncLog(Base):
    __tablename__ = "omeps_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(String(255), ForeignKey("granite_blocks.id"), nullable=False)
    ai_volume = Column(Float, nullable=True)
    ai_weight = Column(Float, nullable=True)
    weighbridge_weight = Column(Float, nullable=True)
    dispatch_weight = Column(Float, nullable=True)
    difference = Column(Float, nullable=True)
    validation_status = Column(String(255), nullable=True) # PASS, WARNING, FAILED
    sync_status = Column(String(255), nullable=True)
    response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    block = relationship("GraniteBlock")


class CitizenPlan(Base):
    __tablename__ = "citizen_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_code = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    granite_type = Column(String(255), nullable=False)
    monthly_tonnage = Column(Float, nullable=False)  # in MT
    estimated_volume_m3 = Column(Float, nullable=False)  # in m3 (density 2.75)
    duration_months = Column(Integer, default=1)
    billing_cycle = Column(String(50), default="monthly")  # monthly, quarterly, annual
    base_rate_per_ton = Column(Float, nullable=False)
    seigniorage_fee = Column(Float, nullable=False)
    dmf_amount = Column(Float, nullable=False)  # 30% DMF
    cess_amount = Column(Float, nullable=False)  # 2% Mineral Cess
    transit_pass_fee = Column(Float, nullable=False)  # Digital Green Pass fee
    total_monthly_amount = Column(Float, nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, PAUSED, CANCELLED
    allocated_tonnage = Column(Float, nullable=False)
    consumed_tonnage = Column(Float, default=0.0)
    delivery_district = Column(String(255), nullable=True)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

