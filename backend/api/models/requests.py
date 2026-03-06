# backend/api/models/requests.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from ..core.database import Base
import uuid

class ServiceRequest311(Base):
    __tablename__ = "service_requests_311"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    objectid = Column(Integer, unique=True, nullable=False)
    servicetype = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500))
    datecreated = Column(DateTime, nullable=False)
    datemodified = Column(DateTime)
    status = Column(String(50), nullable=False)
    description = Column(Text)
    estimatedresolution = Column(String(50))
    
    # PostGIS geometry column for spatial queries
    geom = Column(Geometry('POINT', srid=4326))
    
    def __repr__(self):
        return f"<ServiceRequest311(id={self.id}, type={self.servicetype}, status={self.status})>"
