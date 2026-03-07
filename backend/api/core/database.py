# backend/api/core/database.py
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """Initialize database with PostGIS extension and create tables"""
    # Create PostGIS extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        conn.commit()
    
    # Import all models to ensure they are registered with Base
    try:
        from api.models.crime import CrimeIncident
        from api.models.requests import ServiceRequest311
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database initialized successfully with PostGIS extension")
    except ImportError as e:
        print(f"⚠️ Models not found: {e}")
        print("✅ PostGIS extension created, models will be created when imported")

def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Database connection successful: {version[:50]}...")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
