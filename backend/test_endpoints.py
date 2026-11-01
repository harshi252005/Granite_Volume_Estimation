"""
Full endpoint test suite for Smart Granite backend.
Run this AFTER the backend is up on port 8000.
"""
import requests
import json

BASE = "http://localhost:8000"
RESULTS = []

def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    RESULTS.append((status, name, detail))
    print(f"  [{status}] {name}: {detail}")

# ─────────────────────────────────────────────────────────────
# 1. Health check
# ─────────────────────────────────────────────────────────────
print("\n=== 1. Health ===")
r = requests.get(f"{BASE}/")
log("Root health", r.status_code == 200, r.json().get("status", r.status_code))

# ─────────────────────────────────────────────────────────────
# 2. Login
# ─────────────────────────────────────────────────────────────
print("\n=== 2. Login ===")
r = requests.post(f"{BASE}/api/auth/login", data={"username": "admin", "password": "admin123"})
log("Admin login", r.status_code == 200, r.json().get("token_type") or r.text[:100])
TOKEN = r.json().get("access_token") if r.status_code == 200 else None
HEADERS = {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

# ─────────────────────────────────────────────────────────────
# 3. Chatbot — real DB queries
# ─────────────────────────────────────────────────────────────
print("\n=== 3. Chatbot ===")
for msg in ["show block status", "show flagged blocks", "show revenue summary", "show recent dispatches"]:
    r = requests.post(f"{BASE}/api/chatbot/", json={"message": msg}, headers=HEADERS)
    ok = r.status_code == 200 and ("reply" in r.json() or "response" in r.json())
    raw = r.json().get("reply") or r.json().get("response") or r.text[:100]
    detail = raw[:80].replace("\n", " ") if r.status_code == 200 else r.text[:100]
    log(f"Chatbot: '{msg}'", ok, detail)

# ─────────────────────────────────────────────────────────────
# 4. Analytics — leakage report
# ─────────────────────────────────────────────────────────────
print("\n=== 4. Analytics ===")
r = requests.get(f"{BASE}/api/analytics/leakage-report?limit=5", headers=HEADERS)
ok = r.status_code == 200
d = r.json() if ok else {}
flagged = d.get("total_flagged_blocks", "ERR")
leakage_inr = d.get("total_leakage_inr", "ERR")
log("Leakage report", ok, f"{flagged} blocks flagged, INR {leakage_inr} leakage")

r = requests.get(f"{BASE}/api/analytics/state", headers=HEADERS)
ok = r.status_code == 200
d = r.json() if ok else {}
log("State analytics", ok, f"Total MT: {round(d.get('total_mt', 0), 1)}, Revenue: INR {round(d.get('total_revenue', 0), 0)}")

# ─────────────────────────────────────────────────────────────
# 5. OMEPS
# ─────────────────────────────────────────────────────────────
print("\n=== 5. OMEPS ===")
# Get a real block ID with weighbridge
r_blocks = requests.get(f"{BASE}/api/blocks?limit=1", headers=HEADERS)

# Get real block with weighbridge from DB
import sqlite3
conn = sqlite3.connect("smart_granite.db")
c = conn.cursor()
c.execute("""
    SELECT gb.id FROM granite_blocks gb
    JOIN weighbridge w ON w.block_id = gb.id
    WHERE gb.status = 'dispatched'
    LIMIT 1
""")
row = c.fetchone()
conn.close()

if row:
    test_block_id = row[0]
    r = requests.get(f"{BASE}/api/omeps/validation/{test_block_id}", headers=HEADERS)
    ok = r.status_code == 200
    d = r.json() if ok else {}
    log("OMEPS validation", ok, f"Block {test_block_id}: AI={d.get('ai_weight')}MT, WB={d.get('weighbridge_weight')}MT, Status={d.get('validation_status')}")

    # Sync
    r = requests.post(f"{BASE}/api/omeps/sync", json={}, headers=HEADERS)
    ok = r.status_code == 200
    d = r.json() if ok else {}
    log("OMEPS sync", ok, f"Synced: {d.get('synced', 'ERR')}, Skipped: {d.get('skipped', 'ERR')}")
    
    # Idempotency check
    r2 = requests.post(f"{BASE}/api/omeps/sync", json={}, headers=HEADERS)
    d2 = r2.json() if r2.status_code == 200 else {}
    log("OMEPS sync idempotency", r2.status_code == 200, f"2nd call: Synced={d2.get('synced')}, Skipped={d2.get('skipped')}")
else:
    log("OMEPS validation", False, "No dispatched block with weighbridge found in DB")

# ─────────────────────────────────────────────────────────────
# 6. Blocks
# ─────────────────────────────────────────────────────────────
print("\n=== 6. Blocks ===")
r = requests.get(f"{BASE}/api/blocks", headers=HEADERS)
ok = r.status_code == 200
blocks = r.json() if ok else []
log("List blocks", ok, f"{len(blocks)} blocks returned")

# ─────────────────────────────────────────────────────────────
# 7. Quarries
# ─────────────────────────────────────────────────────────────
print("\n=== 7. Quarries ===")
r = requests.get(f"{BASE}/api/quarries", headers=HEADERS)
ok = r.status_code == 200
quarries = r.json() if ok else []
log("List quarries", ok, f"{len(quarries)} quarries returned")

# ─────────────────────────────────────────────────────────────
# 8. OMEPS logs
# ─────────────────────────────────────────────────────────────
print("\n=== 8. OMEPS Logs ===")
r = requests.get(f"{BASE}/api/omeps/logs", headers=HEADERS)
ok = r.status_code == 200
d = r.json() if ok else []
log("OMEPS logs", ok, f"{len(d)} log entries")

# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
passed = sum(1 for r in RESULTS if r[0] == "PASS")
failed = sum(1 for r in RESULTS if r[0] == "FAIL")
for status, name, detail in RESULTS:
    icon = "✅" if status == "PASS" else "❌"
    print(f"  {icon} {name}")
print(f"\n  Total: {passed} PASS, {failed} FAIL")
