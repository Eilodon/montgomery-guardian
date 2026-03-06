# backend/api/routers/requests.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ..models.schemas import Requests311Response, ServiceRequest311
from ..core.database import get_db
from etl.arcgis_client import fetch_arcgis_dataset
from datetime import datetime

router = APIRouter()

@router.get("/requests-311", response_model=Requests311Response)
async def get_311_requests(
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db)
):
    """
    Get 311 service requests from Montgomery ArcGIS Feature Service.
    Supports filtering by service type, status, and pagination.
    """
    try:
        # Build where clause for filtering
        where_conditions = ["1=1"]
        
        if service_type:
            where_conditions.append(f"UPPER(servicetype) LIKE UPPER('%{service_type}%')")
        
        if status:
            where_conditions.append(f"UPPER(status) LIKE UPPER('%{status}%')")
        
        where_clause = " AND ".join(where_conditions)
        
        # Fetch data from ArcGIS
        df = await fetch_arcgis_dataset(
            dataset="requests_311",
            where=where_clause,
            result_offset=offset,
            result_record_count=limit
        )
        
        # Convert DataFrame to list of ServiceRequest311 objects
        requests = []
        for _, row in df.iterrows():
            request = ServiceRequest311(
                requestId=str(row.get('objectid', row.get('service_request_id', ''))),
                serviceType=_map_service_type(row.get('servicetype', 'other')),
                status=_map_request_status(row.get('status', 'open')),
                latitude=float(row.get('latitude', 0.0)),
                longitude=float(row.get('longitude', 0.0)),
                address=str(row.get('address', 'Unknown Address')),
                createdAt=_parse_timestamp(row.get('datecreated', row.get('createddate'))),
                updatedAt=_parse_timestamp(row.get('datemodified', row.get('updateddate'))),
                description=row.get('description', row.get('servicedescription')),
                estimatedResolutionDays=_parse_resolution_days(row.get('estimatedresolution'))
            )
            requests.append(request)
        
        # Get total count (simplified - in production would make separate count query)
        total = len(df) + offset  # Rough estimate
        
        return Requests311Response(data=requests, total=total)
        
    except Exception as e:
        # Return mock data for demo if API fails
        mock_requests = _get_mock_311_data(service_type, status, limit)
        return Requests311Response(data=mock_requests, total=len(mock_requests))

def _map_service_type(service_type: str) -> str:
    """Map ArcGIS service types to our enum values"""
    if not service_type:
        return 'other'
    
    service_type_lower = service_type.lower()
    if 'pothole' in service_type_lower or 'street' in service_type_lower:
        return 'pothole'
    elif 'graffiti' in service_type_lower or 'vandalism' in service_type_lower:
        return 'graffiti'
    elif 'trash' in service_type_lower or 'garbage' in service_type_lower or 'waste' in service_type_lower:
        return 'trash'
    elif 'flood' in service_type_lower or 'water' in service_type_lower:
        return 'flooding'
    elif 'grass' in service_type_lower or 'vegetation' in service_type_lower or 'overgrown' in service_type_lower:
        return 'overgrown_grass'
    else:
        return 'other'

def _map_request_status(status: str) -> str:
    """Map ArcGIS status to our enum values"""
    if not status:
        return 'open'
    
    status_lower = status.lower()
    if 'closed' in status_lower or 'resolved' in status_lower or 'completed' in status_lower:
        return 'closed'
    elif 'progress' in status_lower or 'work' in status_lower or 'assigned' in status_lower:
        return 'in_progress'
    else:
        return 'open'

def _parse_resolution_days(days_str: str) -> Optional[int]:
    """Parse estimated resolution days"""
    if not days_str:
        return None
    
    try:
        # Try to extract number from string
        import re
        numbers = re.findall(r'\d+', str(days_str))
        if numbers:
            return int(numbers[0])
    except:
        pass
    
    return None

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

def _get_mock_311_data(service_type: Optional[str], status: Optional[str], limit: int) -> List[ServiceRequest311]:
    """Mock data for demo purposes"""
    mock_data = [
        ServiceRequest311(
            requestId="mock_311_1",
            serviceType="pothole",
            status="open",
            latitude=32.3617,
            longitude=-86.2792,
            address="123 Commerce St, Montgomery, AL",
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            description="Large pothole causing traffic hazard",
            estimatedResolutionDays=3
        ),
        ServiceRequest311(
            requestId="mock_311_2",
            serviceType="graffiti",
            status="in_progress",
            latitude=32.3625,
            longitude=-86.2800,
            address="456 Dexter Ave, Montgomery, AL",
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            description="Graffiti on public building",
            estimatedResolutionDays=2
        ),
        ServiceRequest311(
            requestId="mock_311_3",
            serviceType="trash",
            status="closed",
            latitude=32.3600,
            longitude=-86.2785,
            address="789 Perry St, Montgomery, AL",
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
            description="Overflowing public trash can",
            estimatedResolutionDays=1
        ),
    ]
    
    # Filter by service type if specified
    if service_type:
        mock_data = [req for req in mock_data if service_type.lower() in req.serviceType.lower()]
    
    # Filter by status if specified
    if status:
        mock_data = [req for req in mock_data if status.lower() in req.status.lower()]
    
    return mock_data[:limit]
