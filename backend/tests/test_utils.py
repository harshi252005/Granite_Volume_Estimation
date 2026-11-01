import pytest
from app.utils import generate_timestamp_id

def test_generate_timestamp_id_uniqueness():
    """Verify that multiple IDs generated in rapid succession are unique."""
    ids = set()
    for _ in range(1000):
        ids.add(generate_timestamp_id("BLK"))
        
    assert len(ids) == 1000
    
def test_generate_timestamp_id_format():
    """Verify the prefix, timestamp format, and suffix."""
    bid = generate_timestamp_id("BLK")
    parts = bid.split("-")
    assert len(parts) == 3
    assert parts[0] == "BLK"
    assert len(parts[1]) == 14 # %Y%m%d%H%M%S is 14 chars
    assert len(parts[2]) == 6  # UUID suffix is 6 chars
