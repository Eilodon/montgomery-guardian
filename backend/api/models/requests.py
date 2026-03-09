# backend/api/models/requests.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from ..core.database import Base
import uuid

class ServiceRequest311(Base):
    __tablename__ = "service_requests_311"
    
    # THỢ RÈN: Fix 1 - Hợp nhất Bản đồ ORM (Explicit Column Mapping)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    objectid = Column('request_id', String(50), unique=True)
    servicetype = Column('service_type', String(100), nullable=False)
    latitude = Column('location_lat', Float, nullable=False)
    longitude = Column('location_lng', Float, nullable=False)
    address = Column(String(500))
    datecreated = Column('request_date', DateTime, nullable=False)
    datemodified = Column('updated_at', DateTime)
    status = Column('status', String(50), nullable=False)
    description = Column(Text)
    estimatedresolution = Column('estimated_resolution_days', Integer)
    
    # Map đúng tên cột geometry
    geom = Column('geometry', Geometry('POINT', srid=4326))
    
    def __repr__(self):
        return f"<ServiceRequest311(id={self.id}, type={self.servicetype}, status={self.status})>"
