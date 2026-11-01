import os
import sys
from sqlalchemy.sql import text

# Add backend to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from app.models import Base

def migrate():
    sqlite_url = "sqlite:///smart_granite.db"
    mysql_url = "mysql+pymysql://root:@localhost/smart_granite"

    print("Connecting to SQLite...")
    sqlite_engine = create_engine(sqlite_url)
    
    print("Connecting to MySQL...")
    try:
        mysql_engine = create_engine(mysql_url)
        # Test connection
        with mysql_engine.connect() as conn:
            pass
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        print("Please ensure XAMPP is running and the 'smart_granite' database exists.")
        return

    print("Dropping existing tables in MySQL...")
    with mysql_engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    Base.metadata.drop_all(bind=mysql_engine)
    with mysql_engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    print("Creating tables in MySQL...")
    # This will create tables based on our models
    Base.metadata.create_all(bind=mysql_engine)

    # Reflect tables from SQLite to get the data
    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)
    
    # Reflect tables from MySQL to insert data
    mysql_meta = MetaData()
    mysql_meta.reflect(bind=mysql_engine)

    with sqlite_engine.connect() as sqlite_conn:
        with mysql_engine.begin() as mysql_conn:
            # Disable foreign key checks for MySQL during bulk insert
            mysql_conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
            
            for table_name, table in sqlite_meta.tables.items():
                print(f"Migrating table: {table_name}...")
                # Fetch all data from sqlite
                records = sqlite_conn.execute(table.select()).fetchall()
                if not records:
                    print(f"  -> No data in {table_name}, skipping.")
                    continue
                
                print(f"  -> Found {len(records)} records. Inserting into MySQL...")
                
                # Convert records to list of dicts
                # Use ._mapping to get a dict representation of the Row object in SQLAlchemy 2.0
                data = [dict(record._mapping) for record in records]
                
                # Bulk insert into MySQL
                mysql_table = mysql_meta.tables[table_name]
                
                # We can insert in chunks if data is large (49MB could be large for a single statement)
                chunk_size = 5000
                for i in range(0, len(data), chunk_size):
                    chunk = data[i:i + chunk_size]
                    mysql_conn.execute(mysql_table.insert(), chunk)
            
            # Re-enable foreign key checks
            mysql_conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    print("Migration complete successfully!")

if __name__ == "__main__":
    migrate()
