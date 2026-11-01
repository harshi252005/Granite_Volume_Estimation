import sqlite3

def upgrade_db(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE measurements ADD COLUMN edge_measurement_method VARCHAR(80);")
        print("Added edge_measurement_method")
    except sqlite3.OperationalError as e:
        print(f"edge_measurement_method may already exist: {e}")
        
    try:
        cursor.execute("ALTER TABLE measurements ADD COLUMN edge_observation_quality TEXT;")
        print("Added edge_observation_quality")
    except sqlite3.OperationalError as e:
        print(f"edge_observation_quality may already exist: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    upgrade_db("smart_granite.db")
    print("Migration complete.")
