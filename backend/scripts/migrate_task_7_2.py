import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "smart_granite.db"

def migrate():
    print(f"Connecting to database at {DB_PATH}")
    if not DB_PATH.exists():
        print("Database not found, nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing columns in the measurements table
    cursor.execute("PRAGMA table_info(measurements)")
    columns = [row[1] for row in cursor.fetchall()]

    added = 0
    if "convex_hull_volume_m3" not in columns:
        print("Adding column 'convex_hull_volume_m3' to measurements table...")
        cursor.execute("ALTER TABLE measurements ADD COLUMN convex_hull_volume_m3 FLOAT;")
        added += 1

    if "assumed_dressed_volume_m3" not in columns:
        print("Adding column 'assumed_dressed_volume_m3' to measurements table...")
        cursor.execute("ALTER TABLE measurements ADD COLUMN assumed_dressed_volume_m3 FLOAT;")
        added += 1

    if added > 0:
        conn.commit()
        print(f"Migration completed successfully. Added {added} columns.")
    else:
        print("Columns already exist. No migration needed.")

    conn.close()

if __name__ == "__main__":
    migrate()
