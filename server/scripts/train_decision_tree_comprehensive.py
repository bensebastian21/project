import sys
import json
import os
from decision_tree import DecisionTreeClassifier

def train_decision_tree():
    """Train a decision tree model with comprehensive event data"""
    try:
        # Read input data from stdin
        input_data = json.loads(sys.stdin.read())
        training_data = input_data.get('training_data', [])
        
        if not training_data:
            # Use default training data if none provided
            training_data = [
                # Features: [attendance_count, price, duration_hours, is_weekend]
                {"features": [50, 0, 2, 1], "label": 1},    # Popular: 50 attendees, free, 2 hours, weekend
                {"features": [30, 100, 3, 0], "label": 0},  # Not popular: 30 attendees, 100₹, 3 hours, weekday
                {"features": [80, 0, 1, 1], "label": 1},    # Popular: 80 attendees, free, 1 hour, weekend
                {"features": [20, 200, 4, 0], "label": 0},  # Not popular: 20 attendees, 200₹, 4 hours, weekday
                {"features": [90, 0, 2, 1], "label": 1},    # Popular: 90 attendees, free, 2 hours, weekend
                {"features": [15, 150, 3, 0], "label": 0},  # Not popular: 15 attendees, 150₹, 3 hours, weekday
                {"features": [70, 50, 2, 1], "label": 1},   # Popular: 70 attendees, 50₹, 2 hours, weekend
                {"features": [25, 100, 4, 0], "label": 0},  # Not popular: 25 attendees, 100₹, 4 hours, weekday
                {"features": [60, 0, 3, 1], "label": 1},    # Popular: 60 attendees, free, 3 hours, weekend
                {"features": [10, 300, 2, 0], "label": 0},  # Not popular: 10 attendees, 300₹, 2 hours, weekday
                {"features": [85, 25, 2, 1], "label": 1},   # Popular: 85 attendees, 25₹, 2 hours, weekend
                {"features": [12, 250, 4, 0], "label": 0},  # Not popular: 12 attendees, 250₹, 4 hours, weekday
                {"features": [75, 0, 1, 1], "label": 1},    # Popular: 75 attendees, free, 1 hour, weekend
                {"features": [18, 180, 3, 0], "label": 0},  # Not popular: 18 attendees, 180₹, 3 hours, weekday
                {"features": [95, 0, 2, 1], "label": 1},    # Popular: 95 attendees, free, 2 hours, weekend
                {"features": [8, 400, 4, 0], "label": 0},   # Not popular: 8 attendees, 400₹, 4 hours, weekday
                {"features": [65, 30, 2, 1], "label": 1},   # Popular: 65 attendees, 30₹, 2 hours, weekend
                {"features": [22, 120, 3, 0], "label": 0},  # Not popular: 22 attendees, 120₹, 3 hours, weekday
                {"features": [55, 0, 2, 1], "label": 1},    # Popular: 55 attendees, free, 2 hours, weekend
                {"features": [14, 220, 4, 0], "label": 0}   # Not popular: 14 attendees, 220₹, 4 hours, weekday
            ]
            
        # Extract features and labels
        X = [item["features"] for item in training_data]
        y = [item["label"] for item in training_data]
        
        if len(X) == 0 or len(y) == 0:
            print(json.dumps({"error": "Empty training data"}))
            return
            
        # Train the model
        clf = DecisionTreeClassifier(max_depth=10, min_samples_split=2)
        clf.fit(X, y)
        
        # Ensure data directory exists
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        # Save the model
        model_path = os.path.join(data_dir, "decision_tree_model.json")
        clf.save_model(model_path)
        
        # Return success message
        result = {
            "success": True,
            "message": f"Model trained and saved to {model_path}",
            "model_path": model_path,
            "samples_trained": len(y)
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": f"Training failed: {str(e)}"}))

if __name__ == "__main__":
    train_decision_tree()