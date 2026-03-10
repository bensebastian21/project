import json
from decision_tree import DecisionTreeClassifier

def main():
    """Example of using Decision Tree for event popularity prediction"""
    
    # Sample training data for event popularity
    # Features: [attendance_count, price, duration_hours, is_weekend]
    training_data = [
        {"features": [50, 0, 2, 1], "label": 1},    # Popular event: 50 attendees, free, 2 hours, weekend
        {"features": [30, 100, 3, 0], "label": 0},  # Not popular: 30 attendees, 100₹, 3 hours, weekday
        {"features": [80, 0, 1, 1], "label": 1},    # Popular event: 80 attendees, free, 1 hour, weekend
        {"features": [20, 200, 4, 0], "label": 0},  # Not popular: 20 attendees, 200₹, 4 hours, weekday
        {"features": [90, 0, 2, 1], "label": 1},    # Popular event: 90 attendees, free, 2 hours, weekend
        {"features": [15, 150, 3, 0], "label": 0},  # Not popular: 15 attendees, 150₹, 3 hours, weekday
        {"features": [70, 50, 2, 1], "label": 1},   # Popular event: 70 attendees, 50₹, 2 hours, weekend
        {"features": [25, 100, 4, 0], "label": 0},  # Not popular: 25 attendees, 100₹, 4 hours, weekday
        {"features": [60, 0, 3, 1], "label": 1},    # Popular event: 60 attendees, free, 3 hours, weekend
        {"features": [10, 300, 2, 0], "label": 0},  # Not popular: 10 attendees, 300₹, 2 hours, weekday
        {"features": [85, 25, 2, 1], "label": 1},   # Popular event: 85 attendees, 25₹, 2 hours, weekend
        {"features": [12, 250, 4, 0], "label": 0},  # Not popular: 12 attendees, 250₹, 4 hours, weekday
    ]
    
    # Train the model
    X = [item["features"] for item in training_data]
    y = [item["label"] for item in training_data]
    
    clf = DecisionTreeClassifier(max_depth=5)
    clf.fit(X, y)
    
    # Save the model
    model_path = "decision_tree_model.json"
    clf.save_model(model_path)
    print(f"✅ Model trained and saved to {model_path}")
    
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
        print(f"  Features: {event}")
        print()

if __name__ == "__main__":
    main()