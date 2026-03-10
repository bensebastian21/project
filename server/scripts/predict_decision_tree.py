import sys
import json
import os
from decision_tree import DecisionTreeClassifier

def predict_with_decision_tree():
    """Make predictions using the trained decision tree model"""
    try:
        # Read input data from stdin
        input_data = json.loads(sys.stdin.read())
        features = input_data.get('features', [])
        model_path = input_data.get('model_path', 'decision_tree_model.json')
        
        if not features:
            print(json.dumps({"error": "No features provided for prediction"}))
            return
            
        # Check if model file exists
        if not os.path.exists(model_path):
            print(json.dumps({"error": f"Model file not found: {model_path}"}))
            return
            
        # Load the trained model
        clf = DecisionTreeClassifier()
        clf.load_model(model_path)
        
        # Make prediction
        predictions = clf.predict([features])
        
        # Return prediction result
        result = {
            "success": True,
            "prediction": int(predictions[0]),
            "message": "Prediction successful"
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))

if __name__ == "__main__":
    predict_with_decision_tree()