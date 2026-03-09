import sys
import os
from datetime import datetime
import uuid
import json

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from api.models.schemas import CrimeIncident as CrimeSchema, ServiceRequest311 as RequestSchema
from api.models.crime import CrimeIncident as CrimeORM
from api.models.requests import ServiceRequest311 as RequestORM

def test_pydantic_orm_mapping():
    print("🧪 Testing Pydantic ORM Mapping with Aliases...")
    
    # 1. Test CrimeIncident Mapping
    print("\n🔹 Testing CrimeIncident:")
    mock_crime_orm = {
        'id': str(uuid.uuid4()),
        'crimetype': 'violent',
        'latitude': 32.3617,
        'longitude': -86.2792,
        'neighborhood': 'Downtown',
        'incidentdate': datetime.now(),
        'status': 'open',
        'description': 'Test crime'
    }
    
    try:
        # Giả lập data từ ORM trả về (from_attributes=True)
        crime_pydantic = CrimeSchema.model_validate(mock_crime_orm)
        print(f"✅ Crime Pydantic validated: {crime_pydantic.model_dump()}")
        assert crime_pydantic.type == 'violent'
        assert isinstance(crime_pydantic.timestamp, datetime)
    except Exception as e:
        print(f"❌ Crime mapping failed: {e}")
        return False

    # 2. Test ServiceRequest311 Mapping
    print("\n🔹 Testing ServiceRequest311:")
    mock_request_orm = {
        'id': str(uuid.uuid4()),
        'objectid': '311-2024-TEST',
        'servicetype': 'pothole',
        'latitude': 32.3520,
        'longitude': -86.2850,
        'address': '123 Main St',
        'datecreated': datetime.now(),
        'datemodified': datetime.now(),
        'status': 'open',
        'description': 'Test request',
        'estimatedresolution': 5
    }
    
    try:
        request_pydantic = RequestSchema.model_validate(mock_request_orm)
        print(f"✅ Request Pydantic validated: {request_pydantic.model_dump(by_alias=False)}")
        assert request_pydantic.requestId == '311-2024-TEST'
        assert request_pydantic.serviceType == 'pothole'
        assert request_pydantic.estimatedResolutionDays == 5
    except Exception as e:
        print(f"❌ Request mapping failed: {e}")
        return False

    print("\n🎯 All Foundation Mapping Tests PASSED!")
    return True

if __name__ == "__main__":
    success = test_pydantic_orm_mapping()
    if not success:
        sys.exit(1)
