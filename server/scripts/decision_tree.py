import json
import math
from collections import Counter
from typing import List, Dict, Any, Union, Optional, Sequence

class DecisionTreeClassifier:
    def __init__(self, max_depth=10, min_samples_split=2):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree: Optional[Dict[str, Any]] = None
    
    def fit(self, X: Sequence[Sequence[Union[int, float]]], y: Sequence[int]) -> 'DecisionTreeClassifier':
        """Train the decision tree"""
        self.tree = self._build_tree(X, y, depth=0)
        return self
    
    def _build_tree(self, X: Sequence[Sequence[Union[int, float]]], y: Sequence[int], depth: int) -> Dict[str, Any]:
        """Recursively build the decision tree"""
        num_samples = len(y)
        num_features = len(X[0]) if num_samples > 0 else 0
        
        # Stopping criteria
        if (depth >= self.max_depth or 
            num_samples < self.min_samples_split or 
            len(set(y)) == 1):
            # Return leaf node with majority class
            leaf_value = self._majority_class(y)
            return {"leaf": True, "value": leaf_value, "samples": num_samples}
        
        # Find the best split
        best_feature, best_threshold, best_gain = self._best_split(X, y)
        
        if best_gain == 0:
            # No improvement, return leaf
            leaf_value = self._majority_class(y)
            return {"leaf": True, "value": leaf_value, "samples": num_samples}
        
        # Split the data
        left_indices, right_indices = self._split(X, best_feature, best_threshold)
        
        # Recursively build left and right subtrees
        left_tree = self._build_tree(
            [X[i] for i in left_indices], 
            [y[i] for i in left_indices], 
            depth + 1
        )
        right_tree = self._build_tree(
            [X[i] for i in right_indices], 
            [y[i] for i in right_indices], 
            depth + 1
        )
        
        return {
            "leaf": False,
            "feature": best_feature,
            "threshold": best_threshold,
            "left": left_tree,
            "right": right_tree,
            "samples": num_samples
        }
    
    def _best_split(self, X: Sequence[Sequence[Union[int, float]]], y: Sequence[int]) -> tuple:
        """Find the best feature and threshold to split on"""
        best_gain = 0
        best_feature = None
        best_threshold = None
        
        num_features = len(X[0]) if len(X) > 0 else 0
        
        for feature_idx in range(num_features):
            # Get all values for this feature
            feature_values = [row[feature_idx] for row in X]
            thresholds = set(feature_values)
            
            # Try each threshold
            for threshold in thresholds:
                gain = self._information_gain(X, y, feature_idx, threshold)
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature_idx
                    best_threshold = threshold
        
        return best_feature, best_threshold, best_gain
    
    def _information_gain(self, X: Sequence[Sequence[Union[int, float]]], y: Sequence[int], feature_idx: int, threshold: Union[int, float]) -> float:
        """Calculate information gain for a split"""
        # Calculate parent entropy
        parent_entropy = self._entropy(y)
        
        # Split data
        left_indices, right_indices = self._split(X, feature_idx, threshold)
        
        if len(left_indices) == 0 or len(right_indices) == 0:
            return 0
        
        # Calculate weighted entropy of children
        n = len(y)
        n_left, n_right = len(left_indices), len(right_indices)
        entropy_left = self._entropy([y[i] for i in left_indices])
        entropy_right = self._entropy([y[i] for i in right_indices])
        child_entropy = (n_left / n) * entropy_left + (n_right / n) * entropy_right
        
        # Information gain
        return parent_entropy - child_entropy
    
    def _entropy(self, y: Sequence[int]) -> float:
        """Calculate entropy of a list of labels"""
        if len(y) == 0:
            return 0
        
        counts = Counter(y)
        probabilities = [count / len(y) for count in counts.values()]
        entropy = -sum(p * math.log2(p) for p in probabilities if p > 0)
        return entropy
    
    def _split(self, X: Sequence[Sequence[Union[int, float]]], feature_idx: int, threshold: Union[int, float]) -> tuple:
        """Split data based on feature and threshold"""
        left_indices = []
        right_indices = []
        
        for i, row in enumerate(X):
            if row[feature_idx] <= threshold:
                left_indices.append(i)
            else:
                right_indices.append(i)
        
        return left_indices, right_indices
    
    def _majority_class(self, y: Sequence[int]) -> int:
        """Get the majority class in a list of labels"""
        counts = Counter(y)
        return counts.most_common(1)[0][0]
    
    def predict(self, X: Sequence[Sequence[Union[int, float]]]) -> List[int]:
        """Make predictions for a list of samples"""
        if self.tree is None:
            raise ValueError("Model not trained yet. Call fit() first.")
        return [self._predict_sample(sample) for sample in X]
    
    def _predict_sample(self, sample: Sequence[Union[int, float]]) -> int:
        """Make prediction for a single sample"""
        node = self.tree
        while node is not None and not node["leaf"]:
            if sample[node["feature"]] <= node["threshold"]:
                node = node["left"]
            else:
                node = node["right"]
        return node["value"] if node is not None else 0
    
    def save_model(self, filepath: str) -> None:
        """Save the trained model to a file"""
        if self.tree is None:
            raise ValueError("Model not trained yet. Call fit() first.")
        with open(filepath, 'w') as f:
            json.dump(self.tree, f)
    
    def load_model(self, filepath: str) -> None:
        """Load a trained model from a file"""
        with open(filepath, 'r') as f:
            self.tree = json.load(f)

# Example usage
if __name__ == "__main__":
    # Sample data for event popularity prediction
    # Features: [attendance_count, price, duration_hours, is_weekend]
    X = [
        [50, 0, 2, 1],    # 50 attendees, free, 2 hours, weekend
        [30, 100, 3, 0],  # 30 attendees, 100₹, 3 hours, weekday
        [80, 0, 1, 1],    # 80 attendees, free, 1 hour, weekend
        [20, 200, 4, 0],  # 20 attendees, 200₹, 4 hours, weekday
        [90, 0, 2, 1],    # 90 attendees, free, 2 hours, weekend
        [15, 150, 3, 0],  # 15 attendees, 150₹, 3 hours, weekday
        [70, 50, 2, 1],   # 70 attendees, 50₹, 2 hours, weekend
        [25, 100, 4, 0],  # 25 attendees, 100₹, 4 hours, weekday
    ]
    
    # Labels: 1 = popular event, 0 = not popular
    y = [1, 0, 1, 0, 1, 0, 1, 0]
    
    # Train the decision tree
    clf = DecisionTreeClassifier(max_depth=5)
    clf.fit(X, y)
    
    # Make predictions
    predictions = clf.predict(X)
    print("Training accuracy:", sum(p == t for p, t in zip(predictions, y)) / len(y))
    
    # Test with new data
    test_data = [
        [60, 0, 2, 1],    # New event: 60 expected attendees, free, 2 hours, weekend
        [10, 300, 3, 0],  # New event: 10 expected attendees, 300₹, 3 hours, weekday
    ]
    
    test_predictions = clf.predict(test_data)
    print("Test predictions:", test_predictions)
    
    # Save the model
    clf.save_model("decision_tree_model.json")
    print("Model saved to decision_tree_model.json")