import sys
import json
from decision_tree import DecisionTreeClassifier

def train_decision_tree():
    """Train a decision tree model with provided data"""
    try:
        # Read input data from stdin
        input_data = json.loads(sys.stdin.read())
        training_data = input_data.get('training_data', [])
        
        if not training_data:
            print(json.dumps({"error": "No training data provided"}))
            return
            
        # Extract features and labels
        X = []
        y = []
        
        for item in training_data:
            # Assuming each item has 'features' and 'label'
            X.append(item['features'])
            y.append(item['label'])
            
        if len(X) == 0 or len(y) == 0:
            print(json.dumps({"error": "Empty training data"}))
            return
            
        # Train the model
        clf = DecisionTreeClassifier(max_depth=10, min_samples_split=2)
        clf.fit(X, y)
        
        # Save the model
        model_path = "decision_tree_model.json"
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