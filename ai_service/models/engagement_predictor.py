import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
import pickle
import os

MODEL_PATH = "data/engagement_model.pkl"

def _train_dummy_model():
    """
    Since we are starting from scratch, we need a 'cold start' baseline model.
    We generate synthetic data representing 'good' vs 'bad' event descriptions 
    to train our initial RandomForest. The Viral Loop will replace this with real data.
    """
    print("Training Cold-Start Engagement Model...")
    
    # Synthetic Data: Good descriptions are long, use strong verbs, and format well.
    # Bad descriptions are short and vague.
    data = {
        'text': [
            "Join us for an incredible 24-hour hackathon featuring free food, tech talks, and a $1000 prize pool! Perfect for beginners.",
            "Meeting tomorrow. Room 4B.",
            "Exclusive masterclass on Artificial Intelligence and Machine Learning with industry experts from Google and Microsoft. Limited seating.",
            "pizza party at 5",
            "The Annual Engineering Symposium: Showcase your projects, network with alumni, and win the innovator award.",
            "study group for calc",
            "Level up your React skills in this interactive 3-hour frontend development workshop. Bring your laptop!",
            "club meeting."
        ],
        'target_score': [95.0, 15.0, 88.0, 45.0, 92.0, 30.0, 85.0, 10.0] # 0-100 conversion score
    }
    
    df = pd.DataFrame(data)
    
    # Pipeline: Convert text to TF-IDF features -> Train Random Forest
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english', max_features=1000)),
        ('rf', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    pipeline.fit(df['text'], df['target_score'])
    
    # Save the model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(pipeline, f)
        
    print("Cold-Start Model Initialized and Saved.")
    return pipeline

def predict_engagement(generated_copy: str, target_audience: str) -> tuple[float, list[str]]:
    """
    Uses the trained Scikit-Learn model to predict how well the event will do.
    Also returns a rule-based gamification suggestion.
    """
    try:
        # Load model (or train if it's the first time running)
        if not os.path.exists(MODEL_PATH):
            model = _train_dummy_model()
        else:
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
                
        # Predict score based on the generated text
        # Using a list since pipeline expects iterable of strings
        predicted_score = float(model.predict([generated_copy])[0])
        
        # Add slight demographic weights based on audience
        if "beginner" in target_audience.lower() or "all" in target_audience.lower():
            predicted_score += 5.0  # Broader audience usually converts slightly higher
        
        # Clip to 0-100 gauge
        final_score = max(0.0, min(100.0, predicted_score))
        
        # Gamification Recommendation Engine (Rule-based for now)
        rewards = []
        if final_score < 50:
            rewards.append("Offer 500 XP to boost low predicted turnout.")
            rewards.append("Add a 'First 10 get Free Pizza' badge.")
        elif final_score < 80:
            rewards.append("Standard +100 XP for attendance.")
        else:
            rewards.append("Event tracking highly viral. Add an 'Exclusive' tag.")
            rewards.append("Create a leaderboard for attendees.")
            
        return round(final_score, 1), rewards
        
    except Exception as e:
        print(f"Error predicting engagement: {e}")
        return 50.0, ["Standard +100 XP"]

# If run directly to test
if __name__ == "__main__":
    _train_dummy_model()
    score, rewards = predict_engagement("Join us for an incredible hackathon with free food!", "Students")
    print(f"Test Score: {score}, Rewards: {rewards}")
