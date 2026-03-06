# backend/api/models/crime.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from ..core.database import Base
import uuid

class CrimeIncident(Base):
    __tablename__ = "crime_incidents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    objectid = Column(Integer, unique=True, nullable=False)
    crimetype = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    neighborhood = Column(String(100))
    incidentdate = Column(DateTime, nullable=False)
    status = Column(String(50), nullable=False)
    description = Column(Text)
    
    # PostGIS geometry column for spatial queries
    geom = Column(Geometry('POINT', srid=4326))
    
    def __repr__(self):
        return f"<CrimeIncident(id={self.id}, type={self.crimetype}, neighborhood={self.neighborhood})>"
