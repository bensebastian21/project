# Decision Tree Implementation

This document explains how to use the Decision Tree algorithm implementation in the Evenite project.

## Overview

The Decision Tree implementation provides functionality for classification tasks using a Python-based decision tree algorithm. It includes:
- Training functionality
- Prediction functionality
- API endpoints for integration
- Frontend hooks for React components

## File Structure

```
server/
├── scripts/
│   ├── decision_tree.py              # Core Decision Tree implementation
│   ├── train_decision_tree.py        # Training script
│   ├── predict_decision_tree.py      # Prediction script
│   └── decision_tree_example.py      # Example usage
├── routes/
│   └── decisiontree.js               # API endpoints
└── data/
    └── decision_tree_model.json      # Trained model (generated)

client/
├── src/
│   ├── hooks/
│   │   └── useDecisionTree.js        # React hook for Decision Tree API
│   └── pages/
│       └── HostDashboard.jsx         # Example integration point
```

## API Endpoints

### Train Model
```
POST /api/decision-tree/train-model
```

**Request Body:**
```json
{
  "training_data": [
    {
      "features": [feature1, feature2, ...],
      "label": 0 or 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Model trained and saved to decision_tree_model.json",
  "model_path": "decision_tree_model.json",
  "samples_trained": 10
}
```

### Make Prediction
```
POST /api/decision-tree/predict
```

**Request Body:**
```json
{
  "features": [feature1, feature2, ...],
  "model_path": "decision_tree_model.json"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "prediction": 1,
  "message": "Prediction successful"
}
```

## Usage Example

### Training a Model
```javascript
import { useDecisionTree } from '../hooks/useDecisionTree';

const MyComponent = () => {
  const { trainModel, loading, error } = useDecisionTree();
  
  const handleTrain = async () => {
    const trainingData = [
      { features: [50, 0, 2, 1], label: 1 },  // Popular event
      { features: [30, 100, 3, 0], label: 0 }, // Not popular
      // ... more training data
    ];
    
    try {
      const result = await trainModel(trainingData);
      console.log('Model trained:', result);
    } catch (err) {
      console.error('Training failed:', err);
    }
  };
  
  return (
    <button onClick={handleTrain} disabled={loading}>
      {loading ? 'Training...' : 'Train Model'}
    </button>
  );
};
```

### Making Predictions
```javascript
import { useDecisionTree } from '../hooks/useDecisionTree';

const MyComponent = () => {
  const { predict, loading, error } = useDecisionTree();
  
  const handlePredict = async () => {
    const features = [60, 0, 2, 1]; // New event features
    
    try {
      const result = await predict(features);
      console.log('Prediction:', result.prediction);
    } catch (err) {
      console.error('Prediction failed:', err);
    }
  };
  
  return (
    <button onClick={handlePredict} disabled={loading}>
      {loading ? 'Predicting...' : 'Predict Event Popularity'}
    </button>
  );
};
```

## Example Use Case: Event Popularity Prediction

The Decision Tree can be used to predict event popularity based on features like:
- Attendance count
- Price
- Duration
- Is weekend

### Features Format
```javascript
const features = [
  attendanceCount,  // Number of expected attendees
  price,            // Event price in ₹
  durationHours,    // Event duration in hours
  isWeekend         // 1 if weekend, 0 if weekday
];
```

### Labels
- 1: Popular event
- 0: Not popular event

## Python Implementation Details

The Python implementation includes:

### DecisionTreeClassifier Class
- `fit(X, y)`: Train the model
- `predict(X)`: Make predictions
- `save_model(filepath)`: Save trained model
- `load_model(filepath)`: Load trained model

### Key Methods
- `_build_tree()`: Recursively build decision tree
- `_best_split()`: Find optimal feature and threshold for splitting
- `_information_gain()`: Calculate information gain for splits
- `_entropy()`: Calculate entropy of labels

## Integration with Host Dashboard

To integrate Decision Tree functionality into the Host Dashboard:

1. Import the hook:
```javascript
import { useDecisionTree } from '../hooks/useDecisionTree';
```

2. Use the hook in your component:
```javascript
const { trainModel, predict, loading, error } = useDecisionTree();
```

3. Call the functions as needed for training or prediction.

## Example Training Data

For event popularity prediction, you might use training data like:

```javascript
const trainingData = [
  { features: [50, 0, 2, 1], label: 1 },    // 50 attendees, free, 2 hours, weekend -> Popular
  { features: [30, 100, 3, 0], label: 0 },  // 30 attendees, 100₹, 3 hours, weekday -> Not popular
  { features: [80, 0, 1, 1], label: 1 },    // 80 attendees, free, 1 hour, weekend -> Popular
  // ... more examples
];
```

## Running the Example Script

To run the example script that demonstrates event popularity prediction:

```bash
cd server/scripts
python decision_tree_example.py
```

This will:
1. Train a model with sample data
2. Save the model to `decision_tree_model.json`
3. Make predictions on test events
4. Display the results

## Error Handling

The implementation includes comprehensive error handling:
- Input validation
- File existence checks
- Exception handling for training/prediction
- JSON parsing errors
- API error responses

## Model Persistence

The trained model is saved as a JSON file in `server/data/decision_tree_model.json`. This allows:
- Persistence between server restarts
- Model reuse without retraining
- Easy model sharing

## Performance Considerations

- The Decision Tree implementation is suitable for small to medium datasets
- Training time increases with dataset size
- Prediction time is generally fast (O(depth of tree))
- Memory usage is proportional to the size of the tree

## Customization

You can customize the Decision Tree by adjusting parameters:
- `max_depth`: Maximum depth of the tree
- `min_samples_split`: Minimum samples required to split a node

These parameters can be modified in the `decision_tree.py` file.