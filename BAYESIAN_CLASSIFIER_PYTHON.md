# Python Bayesian Classifier Implementation

This document explains the Python implementation of the Bayesian classifier for event categorization.

## Overview

The Bayesian classifier automatically categorizes events based on their descriptions, tags, and other text fields. It uses a Naive Bayes algorithm to predict the most likely category for an event.

## Files

1. **[server/scripts/bayesian_classifier.py](file:///d:/ben/Project/server/scripts/bayesian_classifier.py)** - Python implementation of the Bayesian classifier
2. **[server/scripts/classify_event.py](file:///d:/ben/Project/server/scripts/classify_event.py)** - Script to classify a single event
3. **[server/scripts/get_event_categories.py](file:///d:/ben/Project/server/scripts/get_event_categories.py)** - Script to get top categories for an event
4. **[server/scripts/train_classifier.py](file:///d:/ben/Project/server/scripts/train_classifier.py)** - Script to train the classifier with events
5. **[server/routes/bayesian.js](file:///d:/ben/Project/server/routes/bayesian.js)** - Express routes for the Bayesian classifier API
6. **[client/src/pages/HostDashboard.jsx](file:///d:/ben/Project/client/src/pages/HostDashboard.jsx)** - Frontend integration with classify button

## Python Implementation

The Python script ([bayesian_classifier.py](file:///d:/ben/Project/server/scripts/bayesian_classifier.py)) contains the main BayesianClassifier class with the following methods:

### `BayesianClassifier`

Main class implementing the Naive Bayes algorithm for event categorization.

#### Methods:

- `tokenize(text)` - Tokenizes text into words
- `train(text, category)` - Trains the classifier with labeled data
- `word_probability(word, category)` - Calculates probability of a word given a category
- `category_probability(category)` - Calculates probability of a category
- `classify(text)` - Classifies text into the most likely category
- `get_top_categories(text, n)` - Gets top N categories with their probabilities
- `softmax(scores)` - Applies softmax to convert scores to probabilities
- `save_model(filepath)` - Saves the trained model to a file
- `load_model(filepath)` - Loads a trained model from a file

## API Endpoints

The Bayesian classifier functionality is exposed via the following REST API endpoints:

### POST /api/bayesian/classify-event
Classify an event using the Bayesian classifier.

**Request Body:**
```json
{
  "eventText": "Event description and related text"
}
```

**Response:**
```json
{
  "category": "Technology",
  "confidence": 0.85
}
```

### POST /api/bayesian/event-categories
Get top categories for an event.

**Request Body:**
```json
{
  "eventText": "Event description and related text",
  "n": 3
}
```

**Response:**
```json
{
  "categories": [
    {"category": "Technology", "probability": 0.85},
    {"category": "Education", "probability": 0.10},
    {"category": "Business", "probability": 0.05}
  ]
}
```

### POST /api/bayesian/train-classifier
Train the classifier with events.

**Request Body:**
```json
{
  "events": [
    {
      "text": "Event description and related text",
      "category": "Technology"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Classifier trained with N events",
  "categories": ["Technology", "Business", "Arts", ...]
}
```

## Frontend Integration

The [HostDashboard.jsx](file:///d:/ben/Project/client/src/pages/HostDashboard.jsx) component was updated to:
1. Add a "Classify" button for each event
2. Implement the `classifyEvent` function to call the API
3. Show loading state during classification
4. Update the event category with the classified result

## Testing

The implementation was tested with sample data and verified to work correctly:
- Events with technology-related text are classified as "Technology"
- Events with business-related text are classified as "Business"
- Events with educational content are classified as "Education"

## Benefits of Python Implementation

1. Better performance for complex calculations
2. Easier to extend with more sophisticated algorithms
3. Can leverage Python's rich ecosystem of data science libraries
4. Separation of concerns between frontend/backend logic
5. Consistent results with the JavaScript implementation