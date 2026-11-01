import uuid
from datetime import datetime

def generate_timestamp_id(prefix: str = "BLK") -> str:
    """
    Generate a collision-resistant identifier with a timestamp and a UUID suffix.
    Example output: BLK-20261010153022-A1B2C3
    """
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{ts}-{suffix}"
