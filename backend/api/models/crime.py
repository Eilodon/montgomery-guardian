# backend/api/models/crime.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from ..core.database import Base
import uuid

class CrimeIncident(Base):
    __tablename__ = "crime_incidents"
    
    # THỢ RÈN: Fix 1 - Hợp nhất Bản đồ ORM (Explicit Column Mapping)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    objectid = Column('incident_id', String(50), unique=True)
    crimetype = Column('incident_type', String(100), nullable=False)
    latitude = Column('location_lat', Float, nullable=False)
    longitude = Column('location_lng', Float, nullable=False)
    neighborhood = Column('district', String(100))
    incidentdate = Column('incident_date', DateTime, nullable=False)
    status = Column('status', String(50), nullable=False)
    description = Column(Text)
    
    # Map đúng tên cột geometry
    geom = Column('geometry', Geometry('POINT', srid=4326))
    
    def __repr__(self):
        return f"<CrimeIncident(id={self.id}, type={self.crimetype}, neighborhood={self.neighborhood})>"
