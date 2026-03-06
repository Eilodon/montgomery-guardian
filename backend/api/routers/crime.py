# backend/api/routers/crime.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..models.schemas import CrimeResponse, CrimeIncident
from ..core.database import get_db
from etl.arcgis_client import fetch_arcgis_dataset
from datetime import datetime

router = APIRouter()

@router.get("/crime", response_model=CrimeResponse)
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
        # Build where clause for filtering
        where_clause = "1=1"
        if neighborhood:
            where_clause = f"UPPER(neighborhood) LIKE UPPER('%{neighborhood}%')"
        
        # Fetch data from ArcGIS
        df = await fetch_arcgis_dataset(
            dataset="crime_mapping",
            where=where_clause,
            result_offset=offset,
            result_record_count=limit
        )
        
        # Convert DataFrame to list of CrimeIncident objects
        incidents = []
        for _, row in df.iterrows():
            incident = CrimeIncident(
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
        
        # Get total count (simplified - in production would make separate count query)
        total = len(df) + offset  # Rough estimate
        
        return CrimeResponse(data=incidents, total=total)
        
    except Exception as e:
        # Return mock data for demo if API fails
        mock_incidents = _get_mock_crime_data(neighborhood, limit)
        return CrimeResponse(data=mock_incidents, total=len(mock_incidents))

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

def _get_mock_crime_data(neighborhood: Optional[str], limit: int) -> List[CrimeIncident]:
    """Mock data for demo purposes"""
    mock_data = [
        CrimeIncident(
            id="mock_1",
            type="property",
            latitude=32.3617,
            longitude=-86.2792,
            neighborhood=neighborhood or "Downtown",
            timestamp=datetime.now(),
            status="open",
            description="Burglary reported on Commerce Street"
        ),
        CrimeIncident(
            id="mock_2",
            type="violent",
            latitude=32.3625,
            longitude=-86.2800,
            neighborhood=neighborhood or "Capitol Heights",
            timestamp=datetime.now(),
            status="investigating",
            description="Assault investigation ongoing"
        ),
        CrimeIncident(
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
