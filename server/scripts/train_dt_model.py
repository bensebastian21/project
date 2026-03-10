import json
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from scripts.decision_tree import DecisionTreeClassifier

def main():
    # Sample training data for event popularity
    # Features: [attendance_count, price, duration_hours, is_weekend]
    training_data = [
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
    
    # Train the model
    clf = DecisionTreeClassifier(max_depth=10, min_samples_split=2)
    clf.fit(X, y)
    
    # Ensure data directory exists
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # Save the model
    model_path = os.path.join(data_dir, "decision_tree_model.json")
    clf.save_model(model_path)
    
    print(f"✅ Model trained and saved to {model_path}")
    print(f"📊 Trained with {len(y)} samples")
    
    # Test with new data
    test_events = [
        [60, 0, 2, 1],    # New event: 60 expected attendees, free, 2 hours, weekend
        [10, 300, 3, 0],  # New event: 10 expected attendees, 300₹, 3 hours, weekday
        [75, 50, 1, 1],   # New event: 75 expected attendees, 50₹, 1 hour, weekend
        [5, 500, 4, 0],   # New event: 5 expected attendees, 500₹, 4 hours, weekday
    ]
    
    predictions = clf.predict(test_events)
    
    print("\n🔮 Event Popularity Predictions:")
    for i, (event, prediction) in enumerate(zip(test_events, predictions)):
        popularity = "Popular" if prediction == 1 else "Not Popular"
        print(f"Event {i+1}: {popularity}")
        print(f"  Features: Attendance={event[0]}, Price={event[1]}₹, Duration={event[2]}h, Weekend={'Yes' if event[3] else 'No'}")
        print()

if __name__ == "__main__":
    main()