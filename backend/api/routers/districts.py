# backend/api/routers/districts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..core.database import get_db
from ..models.schemas import DistrictData
from ..models.crime import CrimeIncident
from ..models.requests import ServiceRequest311
import random

router = APIRouter()

@router.get("/districts", response_model=List[DistrictData])
async def get_districts(db: Session = Depends(get_db)):
    """
    Get district safety data with grades and statistics.
    Returns all Montgomery districts with safety metrics.
    """
    try:
        # Define Montgomery districts
        districts_data = [
            {"id": "downtown", "name": "Downtown"},
            {"id": "capitol_heights", "name": "Capitol Heights"},
            {"id": "oak_park", "name": "Oak Park"},
            {"id": "garden_district", "name": "Garden District"},
            {"id": "cloverdale", "name": "Cloverdale"},
            {"id": "bellevue", "name": "Bellevue"},
            {"id": "chisholm", "name": "Chisholm"},
            {"id": "highland_park", "name": "Highland Park"},
            {"id": "tulane", "name": "Tulane"},
            {"id": "washington_park", "name": "Washington Park"},
        ]
        
        districts = []
        
        for district_info in districts_data:
            # Get crime statistics for this district
            crime_count = db.query(CrimeIncident).filter(
                CrimeIncident.neighborhood.ilike(f"%{district_info['name']}%")
            ).count()
            
            # Get 311 backlog for this district
            backlog_count = db.query(ServiceRequest311).filter(
                ServiceRequest311.status == 'open',
                ServiceRequest311.address.ilike(f"%{district_info['name']}%")
            ).count()
            
            # Calculate crime index (crimes per 1000 residents, simulated)
            crime_index = min(100, (crime_count / 10) * 100) if crime_count > 0 else random.uniform(5, 25)
            
            # Calculate trend (random for demo, would be based on historical data)
            trend = random.uniform(-15, 15)
            
            # Assign grade based on crime index and backlog
            grade = _calculate_district_grade(crime_index, backlog_count)
            
            district = DistrictData(
                id=district_info["id"],
                name=district_info["name"],
                grade=grade,
                crimeIndex=round(crime_index, 1),
                backlog311=backlog_count,
                trend=round(trend, 1)
            )
            districts.append(district)
        
        # Sort by name for consistency
        districts.sort(key=lambda x: x.name)
        return districts
        
    except Exception as e:
        print(f"❌ Districts fetch error: {e}")
        # Return mock data on error
        return _get_mock_districts()

def _calculate_district_grade(crime_index: float, backlog_count: int) -> str:
    """Calculate district grade based on safety metrics"""
    # Grade logic: A (best) to F (worst)
    if crime_index < 20 and backlog_count < 10:
        return 'A'
    elif crime_index < 35 and backlog_count < 20:
        return 'B'
    elif crime_index < 50 and backlog_count < 35:
        return 'C'
    elif crime_index < 70 and backlog_count < 50:
        return 'D'
    else:
        return 'F'

def _get_mock_districts() -> List[DistrictData]:
    """Mock district data for demo purposes"""
    return [
        DistrictData(
            id="downtown",
            name="Downtown",
            grade="C",
            crimeIndex=42.3,
            backlog311=28,
            trend=5.2
        ),
        DistrictData(
            id="capitol_heights",
            name="Capitol Heights",
            grade="B",
            crimeIndex=31.8,
            backlog311=15,
            trend=-2.1
        ),
        DistrictData(
            id="oak_park",
            name="Oak Park",
            grade="D",
            crimeIndex=58.9,
            backlog311=41,
            trend=8.7
        ),
        DistrictData(
            id="garden_district",
            name="Garden District",
            grade="A",
            crimeIndex=18.2,
            backlog311=7,
            trend=-3.4
        ),
        DistrictData(
            id="cloverdale",
            name="Cloverdale",
            grade="B",
            crimeIndex=29.5,
            backlog311=12,
            trend=1.8
        ),
        DistrictData(
            id="bellevue",
            name="Bellevue",
            grade="C",
            crimeIndex=45.1,
            backlog311=22,
            trend=0.5
        ),
        DistrictData(
            id="chisholm",
            name="Chisholm",
            grade="D",
            crimeIndex=62.4,
            backlog311=38,
            trend=12.3
        ),
        DistrictData(
            id="highland_park",
            name="Highland Park",
            grade="F",
            crimeIndex=78.6,
            backlog311=55,
            trend=15.8
        ),
        DistrictData(
            id="tulane",
            name="Tulane",
            grade="B",
            crimeIndex=33.7,
            backlog311=18,
            trend=-4.2
        ),
        DistrictData(
            id="washington_park",
            name="Washington Park",
            grade="C",
            crimeIndex=48.9,
            backlog311=31,
            trend=2.9
        ),
    ]
