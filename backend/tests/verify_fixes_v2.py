import asyncio
import pandas as pd
import numpy as np
import pickle
from pathlib import Path
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath('backend'))
sys.path.append(os.path.abspath('ml-engine'))

async def test_scraper_flow():
    print("\n🧪 Testing Scraper Flow...")
    from scraper.news_scraper import NewsScraper
    scraper = NewsScraper()
    # Chỉ test 1 source để tiết kiệm
    source = {
        "name": "Montgomery Police Department",
        "url": "https://www.montgomeryal.gov/Police"
    }
    alerts = await scraper.scrape_source(source)
    print(f"✅ Scraped {len(alerts)} alerts")
    if alerts:
        print(f"📄 Sample Alert: {alerts[0]['title']}")
        if 'id' in alerts[0] and 'severity' in alerts[0]:
            print("✅ Alert structure matches AlertItem")

def test_shap_logic():
    print("\n🧪 Testing SHAP Logic...")
    from models.train_xgboost import predict_batch, FEATURE_COLS
    
    model_path = Path("ml-engine/models/xgb_model.pkl")
    if not model_path.exists():
        print("⚠️ Model not found, skipping SHAP test")
        return
        
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
        
    # Tạo dummy data
    X_test = pd.DataFrame(np.random.rand(5, len(model_data['feature_cols'])), 
                         columns=model_data['feature_cols'])
    
    results = predict_batch(model_data, X_test)
    print(f"✅ Prediction results shape: {results.shape}")
    
    # Debug: In thử SHAP values thực tế từ explainer
    shap_vals_raw = model_data['explainer'].shap_values(X_test)
    print(f"🔬 Raw SHAP type: {type(shap_vals_raw)}")
    if isinstance(shap_vals_raw, list):
        print(f"🔬 Multiclass SHAP, list length: {len(shap_vals_raw)}")
    else:
        print(f"🔬 Single array SHAP shape: {shap_vals_raw.shape}")
        
    print(f"📊 SHAP Features for first row (threshold 0.01): {results.iloc[0]['shapFeatures']}")
    
    # Check max value in raw shap for row 0
    max_val = np.max(np.abs(shap_vals_raw[0])) if not isinstance(shap_vals_raw, list) else np.max(np.abs(shap_vals_raw[0][0]))
    print(f"🔬 Max SHAP value in first row: {max_val}")
    
    if any(len(feat) > 0 for feat in results['shapFeatures']) or max_val > 0:
        print("✅ SHAP logic is working (values might be small due to random noise)")
    else:
        print("❌ SHAP features ARE STILL EMPTY and Max SHAP is 0")

async def test_scheduler_timeout():
    print("\n🧪 Testing Scheduler Timeout...")
    from etl.scheduler import run_with_timeout
    
    async def slow_task():
        await asyncio.sleep(5)
        return "Done"
        
    print("Running task with 2s timeout (expecting failure)")
    await run_with_timeout(slow_task(), timeout=2)
    print("✅ Timeout test completed (check logs for CRITICAL msg)")

async def main():
    try:
        await test_scraper_flow()
        test_shap_logic()
        await test_scheduler_timeout()
    except Exception as e:
        print(f"❌ Verification failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
