# backend/api/routers/crime.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..models import schemas
from ..models.crime import CrimeIncident as DBCrimeIncident
from ..core.database import get_db
from ..core.redis import get_cached_data, cache_data
from etl.arcgis_client import fetch_arcgis_dataset
from datetime import datetime
from sqlalchemy import func
import json
import random

router = APIRouter()

@router.get("/crime", response_model=schemas.CrimeResponse)
async def get_crime_incidents(
    neighborhood: Optional[str] = Query(None, description="Filter by neighborhood"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db)
):
    """
    Get crime incidents from Montgomery ArcGIS Feature Service.
    Supports filtering by neighborhood and pagination.
    """
    try:
        # Check cache first
        cache_key = f"crime_cache:{neighborhood}:{limit}:{offset}"
        cached = await get_cached_data(cache_key)
        if cached:
            return CrimeResponse(data=cached["data"], total=cached["total"])
        
        # Build where clause for filtering
        params = {}
        if neighborhood:
            where_clause = "UPPER(neighborhood) LIKE UPPER(:neighborhood)"
            params["neighborhood"] = f"%{neighborhood}%"
        else:
            where_clause = "1=1"
        
        # Fetch data from ArcGIS
        df = await fetch_arcgis_dataset(
            dataset="crime_mapping",
            where=where_clause,
            params=params,
            result_offset=offset,
            result_record_count=limit
        )
        
        # Convert DataFrame to list of CrimeIncident objects
        incidents = []
        for _, row in df.iterrows():
            incident = schemas.CrimeIncident(
                id=str(row.get('objectid', row.get('id', ''))),
                type=_map_crime_type(row.get('crimetype', 'other')),
                latitude=float(row.get('latitude', 0.0)),
                longitude=float(row.get('longitude', 0.0)),
                neighborhood=str(row.get('neighborhood', 'Unknown')),
                timestamp=_parse_timestamp(row.get('incidentdate', row.get('datecreated'))),
                status=_map_status(row.get('status', 'open')),
                description=row.get('description', row.get('incidentdescription'))
            )
            incidents.append(incident)
        
        # Cache the results for 5 minutes
        await cache_data(cache_key, {"data": incidents, "total": len(incidents)}, ttl=300)
        
        return schemas.CrimeResponse(data=incidents, total=len(incidents))
        
    except Exception as e:
        print(f"❌ Crime data fetch error: {e}")
        mock_incidents = _get_mock_crime_data(neighborhood, limit)
        return schemas.CrimeResponse(data=mock_incidents, total=len(mock_incidents))

@router.get("/districts", response_model=schemas.DistrictsResponse)
async def get_district_stats(db: Session = Depends(get_db)):
    """
    Get crime statistics grouped by district/neighborhood.
    Provides safety scores and incident breakdown for each area.
    """
    try:
        # Get count by neighborhood
        neighborhood_counts = db.query(
            DBCrimeIncident.neighborhood,
            func.count(DBCrimeIncident.id).label('count')
        ).group_by(DBCrimeIncident.neighborhood).order_by(func.count(DBCrimeIncident.id).desc()).all()
        
        districts = []
        for neighborhood, count in neighborhood_counts:
            # Calculate mock safety score based on count (more crimes = lower score)
            score = max(30, 95 - (count / 10))
            
            # Map score to grade
            if score >= 90: grade = 'A'
            elif score >= 80: grade = 'B'
            elif score >= 70: grade = 'C'
            elif score >= 60: grade = 'D'
            else: grade = 'F'
            
            districts.append(schemas.DistrictData(
                id=neighborhood.lower().replace(" ", "_"),
                name=neighborhood,
                grade=grade,
                crimeIndex=float(count), # simplification
                backlog311=random.randint(5, 50),
                trend=round(random.uniform(-5.0, 5.0), 1)
            ))
            
        # If no districts in DB, use mock set
        if not districts:
            districts = _get_mock_districts()
            
        return schemas.DistrictsResponse(data=districts, total=len(districts))
        
    except Exception as e:
        print(f"❌ Districts endpoint error: {e}")
        return schemas.DistrictsResponse(data=_get_mock_districts(), total=0)

def _get_mock_districts() -> List[schemas.DistrictData]:
    """Mock districts for demo purposes"""
    return [
        schemas.DistrictData(
            id="downtown",
            name="Downtown",
            grade="C",
            crimeIndex=45.0,
            backlog311=12,
            trend=-1.2
        ),
        schemas.DistrictData(
            id="capitol_heights",
            name="Capitol Heights",
            grade="B",
            crimeIndex=22.5,
            backlog311=5,
            trend=0.5
        ),
    ]

def _map_crime_type(crime_type: str) -> str:
    """Map ArcGIS crime types to our enum values"""
    if not crime_type:
        return 'other'
    
    crime_type_lower = crime_type.lower()
    if any(word in crime_type_lower for word in ['assault', 'homicide', 'robbery', 'violent']):
        return 'violent'
    elif any(word in crime_type_lower for word in ['burglary', 'theft', 'larceny', 'property']):
        return 'property'
    elif any(word in crime_type_lower for word in ['drug', 'narcotic', 'possession']):
        return 'drug'
    else:
        return 'other'

def _map_status(status: str) -> str:
    """Map ArcGIS status to our enum values"""
    if not status:
        return 'open'
    
    status_lower = status.lower()
    if 'closed' in status_lower or 'resolved' in status_lower:
        return 'closed'
    elif 'invest' in status_lower or 'pending' in status_lower:
        return 'investigating'
    else:
        return 'open'

def _parse_timestamp(date_str: str) -> datetime:
    """Parse various timestamp formats from ArcGIS"""
    if not date_str:
        return datetime.now()
    
    try:
        # Try ISO format first
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        try:
            # Try common formats
            return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        except:
            # Fallback to current time
            return datetime.now()

def _get_mock_crime_data(neighborhood: Optional[str], limit: int) -> List[schemas.CrimeIncident]:
    """Mock data for demo purposes"""
    mock_data = [
        schemas.CrimeIncident(
            id="mock_1",
            type="property",
            latitude=32.3617,
            longitude=-86.2792,
            neighborhood=neighborhood or "Downtown",
            timestamp=datetime.now(),
            status="open",
            description="Burglary reported on Commerce Street"
        ),
        schemas.CrimeIncident(
            id="mock_2",
            type="violent",
            latitude=32.3625,
            longitude=-86.2800,
            neighborhood=neighborhood or "Capitol Heights",
            timestamp=datetime.now(),
            status="investigating",
            description="Assault investigation ongoing"
        ),
        schemas.CrimeIncident(
            id="mock_3",
            type="drug",
            latitude=32.3600,
            longitude=-86.2785,
            neighborhood=neighborhood or "Oak Park",
            timestamp=datetime.now(),
            status="closed",
            description="Drug possession case resolved"
        ),
    ]
    
    return mock_data[:limit]
