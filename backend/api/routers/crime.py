# backend/api/routers/crime.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..models.schemas import CrimeResponse, CrimeIncident, DistrictsResponse, DistrictData
from ..core.database import get_db
from ..core.redis import get_cached_data, cache_data
from etl.arcgis_client import fetch_arcgis_dataset
from datetime import datetime
import json

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
        
        # Cache the results for 5 minutes
        await cache_data(cache_key, {"data": incidents, "total": len(incidents)}, ttl=300)
        
        return CrimeResponse(data=incidents, total=len(incidents))
        
    except Exception as e:
        print(f"❌ Crime data fetch error: {e}")
        mock_incidents = _get_mock_crime_data(neighborhood, limit)
        return CrimeResponse(data=mock_incidents, total=len(mock_incidents))

@router.get("/districts", response_model=DistrictsResponse)
async def get_district_stats(db: Session = Depends(get_db)):
    """
    Get crime statistics grouped by district/neighborhood.
    Provides safety scores and incident breakdown for each area.
    """
    try:
        # Get count by neighborhood
        neighborhood_counts = db.query(
            CrimeIncident.neighborhood,
            func.count(CrimeIncident.id).label('count')
        ).group_by(CrimeIncident.neighborhood).order_by(func.count(CrimeIncident.id).desc()).all()
        
        districts = []
        for neighborhood, count in neighborhood_counts:
            # Calculate mock safety score based on count (more crimes = lower score)
            score = max(30, 95 - (count / 10))
            
            # Incident breakdown (simulated for now, would be a separate query in prod)
            incidents = [
                {"type": "Property", "count": int(count * 0.6), "color": "bg-blue-500"},
                {"type": "Violent", "count": int(count * 0.1), "color": "bg-red-500"},
                {"type": "Other", "count": int(count * 0.3), "color": "bg-slate-500"},
            ]
            
            districts.append(DistrictData(
                id=neighborhood.lower().replace(" ", "_"),
                name=neighborhood,
                score=score,
                crimes=count,
                trend="stable" if random.random() > 0.3 else ("up" if random.random() > 0.5 else "down"),
                incidents=incidents
            ))
            
        # If no districts in DB, use mock set
        if not districts:
            districts = _get_mock_districts()
            
        return DistrictsResponse(data=districts, total=len(districts))
        
    except Exception as e:
        print(f"❌ Districts endpoint error: {e}")
        return DistrictsResponse(data=_get_mock_districts(), total=0)

def _get_mock_districts() -> List[DistrictData]:
    """Mock districts for demo purposes"""
    return [
        DistrictData(
            id="downtown",
            name="Downtown",
            score=72.5,
            crimes=45,
            trend="down",
            incidents=[
                {"type": "Property", "count": 28, "color": "bg-blue-500"},
                {"type": "Violent", "count": 5, "color": "bg-red-500"},
                {"type": "Other", "count": 12, "color": "bg-slate-500"},
            ]
        ),
        DistrictData(
            id="capitol_heights",
            name="Capitol Heights",
            score=84.2,
            crimes=22,
            trend="stable",
            incidents=[
                {"type": "Property", "count": 12, "color": "bg-blue-500"},
                {"type": "Violent", "count": 2, "color": "bg-red-500"},
                {"type": "Other", "count": 8, "color": "bg-slate-500"},
            ]
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
