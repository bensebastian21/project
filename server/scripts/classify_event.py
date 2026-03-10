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
        event_text = input_data['event_text']
        
        # Load the trained classifier
        classifier = BayesianClassifier()
        model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'eventClassifierModel.json')
        classifier.load_model(model_path)
        
        # Classify the event
        result = classifier.classify(event_text)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()