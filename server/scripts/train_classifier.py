import json
import sys
import os

# Add the parent directory to the Python path to import bayesian_classifier
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from bayesian_classifier import BayesianClassifier

def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        events = input_data['events']
        
        # Create and train the classifier
        classifier = BayesianClassifier()
        
        trained_count = 0
        for event in events:
            text = event.get('text', '')
            category = event.get('category', '')
            if text and category:
                classifier.train(text, category)
                trained_count += 1
        
        # Save the trained model
        model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'eventClassifierModel.json')
        # Ensure data directory exists
        data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        classifier.save_model(model_path)
        
        # Output result as JSON
        result = {
            "message": f"✅ Classifier trained with {trained_count} events",
            "categories": classifier.categories
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()