#!/usr/bin/env python3
# backend/test_pipeline.py
"""
Complete pipeline test script for Montgomery Guardian
Tests all components: Database, Redis, ChromaDB, ETL, API
"""

import asyncio
import json
from datetime import datetime

async def test_database_connection():
    """Test PostgreSQL connection"""
    print("🔍 Testing PostgreSQL connection...")
    try:
        from api.core.database import test_connection, init_database
        if test_connection():
            print("✅ PostgreSQL connection successful")
            return True
        else:
            print("❌ PostgreSQL connection failed")
            return False
    except Exception as e:
        print(f"❌ PostgreSQL test failed: {e}")
        return False

async def test_redis_connection():
    """Test Redis connection"""
    print("🔍 Testing Redis connection...")
    try:
        from api.core.redis import test_redis_connection
        if await test_redis_connection():
            print("✅ Redis connection successful")
            return True
        else:
            print("❌ Redis connection failed")
            return False
    except Exception as e:
        print(f"❌ Redis test failed: {e}")
        return False

async def test_chroma_connection():
    """Test ChromaDB connection"""
    print("🔍 Testing ChromaDB connection...")
    try:
        from etl.chroma_setup import ChromaSetup
        chroma = ChromaSetup()
        if chroma.test_chroma_connection():
            print("✅ ChromaDB connection successful")
            return True
        else:
            print("❌ ChromaDB connection failed")
            return False
    except Exception as e:
        print(f"❌ ChromaDB test failed: {e}")
        return False

async def test_etl_pipeline():
    """Test ETL pipeline"""
    print("🔍 Testing ETL pipeline...")
    try:
        from etl.scheduler import start_etl_once
        await start_etl_once()
        print("✅ ETL pipeline test successful")
        return True
    except Exception as e:
        print(f"❌ ETL pipeline test failed: {e}")
        return False

async def test_data_availability():
    """Test if data is available in cache"""
    print("🔍 Testing data availability...")
    try:
        from api.core.redis import redis_client
        
        # Test crime data
        crime_data = await redis_client.get("crime_data_cache")
        crime_count = len(json.loads(crime_data)) if crime_data and isinstance(crime_data, str) else 0
        print(f"📊 Crime data available: {crime_count} records")
        
        # Test 311 data
        requests_data = await redis_client.get("requests_311_data_cache")
        requests_count = len(json.loads(requests_data)) if requests_data and isinstance(requests_data, str) else 0
        print(f"📋 311 requests available: {requests_count} records")
        
        # Test news alerts
        alerts_data = await redis_client.get("news_alerts")
        alerts_count = len(json.loads(alerts_data)) if alerts_data and isinstance(alerts_data, str) else 0
        print(f"📰 News alerts available: {alerts_count} records")
        
        if crime_count > 0 and requests_count > 0 and alerts_count > 0:
            print("✅ All data types available in cache")
            return True
        else:
            print("⚠️ Some data types missing from cache")
            return False
            
    except Exception as e:
        print(f"❌ Data availability test failed: {e}")
        return False

async def generate_pipeline_report():
    """Generate comprehensive pipeline report"""
    print("\n" + "="*60)
    print("📊 MONTGOMERY GUARDIAN PIPELINE STATUS REPORT")
    print("="*60)
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test all components
    results = {
        "PostgreSQL": await test_database_connection(),
        "Redis": await test_redis_connection(), 
        "ChromaDB": await test_chroma_connection(),
        "ETL Pipeline": await test_etl_pipeline(),
        "Data Availability": await test_data_availability()
    }
    
    print("\n📋 COMPONENT STATUS:")
    print("-" * 30)
    for component, status in results.items():
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {component}: {'OPERATIONAL' if status else 'FAILED'}")
    
    # Overall status
    operational_count = sum(results.values())
    total_count = len(results)
    overall_status = operational_count == total_count
    
    print(f"\n📈 OVERALL STATUS: {'OPERATIONAL' if overall_status else 'PARTIAL OUTAGE'}")
    print(f"📊 Components Operational: {operational_count}/{total_count}")
    
    if overall_status:
        print("\n🎉 BLOCK 1 COMPLETED SUCCESSFULLY!")
        print("✅ Data Layer & ETL Pipeline is fully operational")
        print("🚀 Ready for BLOCK 2: API Layer Implementation")
    else:
        print("\n⚠️ BLOCK 1 NEEDS ATTENTION!")
        print("❌ Some components require fixes before proceeding")
    
    print("="*60)
    
    return overall_status

async def main():
    """Main test runner"""
    print("🚀 Starting Montgomery Guardian Pipeline Test...")
    
    try:
        success = await generate_pipeline_report()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
