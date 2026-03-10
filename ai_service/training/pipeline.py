import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
import pickle
import os
import json

# This script is designed to be run via a cron job (e.g., nightly)
# It takes actual Evenite app data (how many people viewed vs registered for an event)
# and uses it to re-train the Scikit-Learn model so it gets smarter over time.

FEEDBACK_FILE = "../data/viral_feedback.json"
MODEL_PATH = "../data/engagement_model.pkl"

def retrain_engagement_model():
    print("Initiating GenLoop Viral Feedback Training Pipeline...")
    
    if not os.path.exists(FEEDBACK_FILE):
        print("No new feedback data found. Skipping training.")
        return
        
    try:
        # 1. Load historical JSON feedback data dumped by the FastAPI server
        with open(FEEDBACK_FILE, 'r') as f:
            raw_data = json.load(f)
            
        if len(raw_data) < 10:
            print("Not enough new data points to justify a retrain (Need >10).")
            return
            
        print(f"Loaded {len(raw_data)} real-world event performance metrics.")
        
        # 2. Extract features and labels
        texts = []
        scores = []
        
        for event in raw_data:
            """
            Calculates an absolute 'Viral Conversion Score' (0-100).
            If an event gets 100 views and 25 registrations, that is a 25% conversion rate.
            We scale this. A 30% conversion rate on student events is usually 'Viral' (100 score).
            """
            views = max(1, event.get('views', 1))
            regs = event.get('registrations', 0)
            
            conversion_rate = (regs / views) * 100
            
            # Map a 30% real conversion rate to a 100 AI score
            ai_score = min(100.0, (conversion_rate / 30.0) * 100.0)
            
            texts.append(event.get('aiDescription', ''))
            scores.append(ai_score)
            
        df = pd.DataFrame({'text': texts, 'target_score': scores})
        
        # 3. Define the Retraining Pipeline
        print("Fitting new TF-IDF Vectorizer and Random Forest...")
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=2000)),
            ('rf', RandomForestRegressor(n_estimators=200, random_state=42)) # Increased estimators for real data
        ])
        
        # 4. Train the model tightly on actual student behavior
        pipeline.fit(df['text'], df['target_score'])
        
        # 5. Save the upgraded model, overwriting the old one
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, 'wb') as f:
            pickle.dump(pipeline, f)
            
        print("✅ Pipeline Success: GenLoop model has been upgraded with real viral data.")
        
        # 6. Archive the old feedback to prevent over-fitting on the same events repeatedly
        os.rename(FEEDBACK_FILE, f"../data/archived_feedback_{pd.Timestamp.now().strftime('%Y%m%d')}.json")
        
    except Exception as e:
        print(f"❌ Pipeline Failure: Error retraining model: {e}")

if __name__ == "__main__":
    retrain_engagement_model()
