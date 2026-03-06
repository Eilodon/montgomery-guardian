# backend/etl/arcgis_client.py
import httpx
import pandas as pd
from typing import Optional
import os

ARCGIS_BASE = "https://opendata.montgomeryal.gov/datasets"

DATASET_URLS = {
    "crime_mapping": f"{ARCGIS_BASE}/crime-mapping/FeatureServer/0/query",
    "requests_311": f"{ARCGIS_BASE}/311-service-requests/FeatureServer/0/query",
    "census": f"{ARCGIS_BASE}/census-information/FeatureServer/0/query",
}

# Fallback: nếu ArcGIS API down → dùng file CSV đã download sẵn
FALLBACK_CSV = {
    "crime_mapping": "data/crime_mapping_fallback.csv",
    "requests_311": "data/requests_311_fallback.csv",
}

async def fetch_arcgis_dataset(
    dataset: str,
    where: str = "1=1",
    out_fields: str = "*",
    result_offset: int = 0,
    result_record_count: int = 2000,
) -> pd.DataFrame:
    """
    Fetch data from Montgomery ArcGIS Feature Service.
    Falls back to local CSV if API unavailable.
    """
    url = DATASET_URLS[dataset]
    params = {
        "where": where,
        "outFields": out_fields,
        "outSR": "4326",  # WGS84
        "f": "json",
        "resultOffset": result_offset,
        "resultRecordCount": result_record_count,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "features" not in data:
                raise ValueError(f"Unexpected response structure: {data.keys()}")

            records = [f["attributes"] for f in data["features"]]
            # Add geometry if available
            for i, f in enumerate(data["features"]):
                if "geometry" in f and f["geometry"]:
                    records[i]["latitude"] = f["geometry"].get("y")
                    records[i]["longitude"] = f["geometry"].get("x")

            return pd.DataFrame(records)

    except Exception as e:
        print(f"⚠️ ArcGIS API failed for {dataset}: {e}. Using fallback CSV.")
        if dataset in FALLBACK_CSV:
            fallback_path = os.path.join(os.path.dirname(__file__), FALLBACK_CSV[dataset])
            if os.path.exists(fallback_path):
                return pd.read_csv(fallback_path)
            else:
                print(f"⚠️ Fallback CSV not found: {fallback_path}")
        raise

def create_fallback_data():
    """Create fallback CSV files with sample data"""
    import os
    from datetime import datetime, timedelta
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Create crime mapping fallback data
    crime_data = []
    for i in range(100):
        crime_data.append({
            'objectid': i + 1,
            'crimetype': ['burglary', 'assault', 'theft', 'drug', 'other'][i % 5],
            'latitude': 32.3617 + (i % 10) * 0.001,
            'longitude': -86.2792 + (i % 10) * 0.001,
            'neighborhood': ['Downtown', 'Capitol Heights', 'Oak Park', 'Garden District'][i % 4],
            'incidentdate': (datetime.now() - timedelta(days=i % 30)).isoformat(),
            'status': ['open', 'closed', 'investigating'][i % 3],
            'description': f'Sample crime incident {i + 1}'
        })
    
    crime_df = pd.DataFrame(crime_data)
    crime_df.to_csv(os.path.join(data_dir, "crime_mapping_fallback.csv"), index=False)
    
    # Create 311 requests fallback data
    requests_data = []
    service_types = ['pothole', 'graffiti', 'trash', 'flooding', 'overgrown_grass', 'other']
    for i in range(100):
        requests_data.append({
            'objectid': i + 1001,
            'servicetype': service_types[i % len(service_types)],
            'latitude': 32.3617 + (i % 10) * 0.001,
            'longitude': -86.2792 + (i % 10) * 0.001,
            'address': f'{123 + i} Main St, Montgomery, AL',
            'datecreated': (datetime.now() - timedelta(days=i % 30)).isoformat(),
            'datemodified': (datetime.now() - timedelta(days=(i % 30) - 1)).isoformat(),
            'status': ['open', 'in_progress', 'closed'][i % 3],
            'description': f'Sample 311 request {i + 1}',
            'estimatedresolution': str(1 + (i % 7))
        })
    
    requests_df = pd.DataFrame(requests_data)
    requests_df.to_csv(os.path.join(data_dir, "requests_311_fallback.csv"), index=False)
    
    print("✅ Fallback CSV files created successfully")
