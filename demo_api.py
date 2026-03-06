
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uvicorn

app = FastAPI(title="Montgomery Guardian Demo API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    conn = sqlite3.connect('montgomery_demo.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "montgomery-guardian-demo-api"}

@app.get("/api/v1/kpis")
async def get_kpis():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get incidents today
    cursor.execute("""
        SELECT COUNT(*) as count FROM crime_incidents 
        WHERE DATE(incident_date) = DATE('now')
    """)
    incidents_today = cursor.fetchone()['count']
    
    # Get total incidents in last 7 days for trend
    cursor.execute("""
        SELECT DATE(incident_date) as date, COUNT(*) as count 
        FROM crime_incidents 
        WHERE incident_date >= DATE('now', '-7 days')
        GROUP BY DATE(incident_date)
        ORDER BY date
    """)
    sparkline_data = [row['count'] for row in cursor.fetchall()]
    
    # Get open 311 requests
    cursor.execute("""
        SELECT COUNT(*) as count FROM service_requests_311 
        WHERE status IN ('open', 'in_progress')
    """)
    open_requests = cursor.fetchone()['count']
    
    # Get top 311 category
    cursor.execute("""
        SELECT service_type, COUNT(*) as count 
        FROM service_requests_311 
        WHERE status IN ('open', 'in_progress')
        GROUP BY service_type 
        ORDER BY count DESC 
        LIMIT 1
    """)
    top_category = cursor.fetchone()
    top_category_name = top_category['service_type'] if top_category else 'None'
    
    conn.close()
    
    return {
        "incidentsToday": {
            "count": incidents_today,
            "trend": {"direction": "up", "percentage": 12}
        },
        "calls911": {
            "count": 1247,
            "sparklineData": sparkline_data[-7:] if len(sparkline_data) >= 7 else [180, 220, 195, 240, 210, 260, 245]
        },
        "open311Requests": {
            "count": open_requests,
            "topCategory": top_category_name
        },
        "avgResponseTime": {
            "minutes": 8,
            "trend": {"direction": "down", "percentage": 15}
        }
    }

@app.get("/api/v1/alerts/live")
async def get_live_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM crime_incidents 
        WHERE status = 'active' 
        AND incident_date >= datetime('now', '-24 hours')
        ORDER BY incident_date DESC 
        LIMIT 10
    """)
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            "id": row['id'],
            "title": f"{row['incident_type']} Reported",
            "summary": row['description'],
            "severity": row['severity'],
            "source": "Police Department",
            "timestamp": row['incident_date']
        })
    
    conn.close()
    return alerts

@app.get("/api/v1/districts")
async def get_districts():
    # Generate district safety scores based on crime data
    districts = ['Downtown', 'Bethesda', 'Silver Spring', 'Wheaton', 'Rockville', 'Gaithersburg', 'Germantown', 'Takoma Park']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    district_data = []
    for district in districts:
        cursor.execute("""
            SELECT COUNT(*) as count,
                   AVG(CASE severity 
                       WHEN 'critical' THEN 4 
                       WHEN 'high' THEN 3 
                       WHEN 'medium' THEN 2 
                       WHEN 'low' THEN 1 
                       ELSE 2 END) as avg_severity
            FROM crime_incidents 
            WHERE district = ? 
            AND incident_date >= datetime('now', '-30 days')
        """, (district,))
        
        result = cursor.fetchone()
        crime_count = result['count'] if result else 0
        avg_severity = result['avg_severity'] if result and result['avg_severity'] else 2
        
        # Calculate grade based on crime index
        crime_index = crime_count * avg_severity / 10
        if crime_index < 2:
            grade = 'A'
        elif crime_index < 3:
            grade = 'B'
        elif crime_index < 4:
            grade = 'C'
        elif crime_index < 5:
            grade = 'D'
        else:
            grade = 'F'
        
        district_data.append({
            "id": district.lower().replace(' ', '_'),
            "name": district,
            "grade": grade,
            "crimeIndex": round(crime_index, 1),
            "backlog311": random.randint(5, 100),
            "trend": random.randint(-20, 20)
        })
    
    conn.close()
    return district_data

@app.get("/api/v1/predictions")
async def get_predictions():
    # Generate mock prediction data
    predictions = []
    for i in range(50):
        predictions.append({
            "gridCellId": f"grid_{i}",
            "latitude": 39.0 + random.uniform(-0.2, 0.2),
            "longitude": -77.0 + random.uniform(-0.3, 0.3),
            "riskLevel": random.choice(['low', 'medium', 'high', 'critical']),
            "confidenceScore": round(random.uniform(0.6, 0.95), 2),
            "generatedAt": datetime.now().isoformat()
        })
    
    return predictions

@app.get("/api/v1/predictions/heatmap")
async def get_heatmap_data():
    # Generate heatmap GeoJSON data
    features = []
    for i in range(100):
        lat = 39.0 + random.uniform(-0.2, 0.2)
        lng = -77.0 + random.uniform(-0.3, 0.3)
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lng, lat]
            },
            "properties": {
                "riskLevel": random.choice(['low', 'medium', 'high', 'critical']),
                "confidence": round(random.uniform(0.6, 0.95), 2),
                "intensity": random.uniform(0.1, 1.0)
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.get("/api/v1/requests/active")
async def get_active_requests():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM service_requests_311 
        WHERE status IN ('open', 'in_progress')
        ORDER BY request_date DESC 
        LIMIT 50
    """)
    
    requests = []
    for row in cursor.fetchall():
        requests.append({
            "id": row['id'],
            "serviceType": row['service_type'],
            "description": row['description'],
            "latitude": row['location_lat'],
            "longitude": row['location_lng'],
            "status": row['status'],
            "priority": row['priority'],
            "requestDate": row['request_date']
        })
    
    conn.close()
    return requests

@app.get("/api/v1/predictions/explain")
async def get_shap_explainability():
    # Generate SHAP explainability data
    features = [
        {"name": "Hour of Day", "importance": 0.15, "category": "temporal"},
        {"name": "Day of Week", "importance": 0.12, "category": "temporal"},
        {"name": "Distance to Downtown", "importance": 0.18, "category": "spatial"},
        {"name": "Crime Count (7 days)", "importance": 0.22, "category": "temporal"},
        {"name": "311 Requests (30 days)", "importance": 0.20, "category": "311"},
        {"name": "Weather Temperature", "importance": 0.08, "category": "weather"},
        {"name": "Is Weekend", "importance": 0.05, "category": "temporal"}
    ]
    
    return {
        "features": features,
        "modelType": "ensemble",
        "totalFeatures": len(features),
        "generatedAt": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
