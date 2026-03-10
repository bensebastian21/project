# Bayesian Classifier Implementation

This document explains how the Bayesian Classifier is implemented in the Event Management System for automatic event categorization.

## Overview

The Bayesian Classifier uses Naive Bayes algorithm to automatically categorize events based on:
- Event descriptions
- Tags
- Historical data

## Implementation Details

### Backend Components

1. **BayesianClassifier Class** (`server/utils/bayesianClassifier.js`)
   - Core implementation of the Naive Bayes algorithm
   - Handles text tokenization, probability calculations, and classification
   - Supports model persistence (save/load)

2. **Event Model Integration** (`server/models/Event.js`)
   - Added methods to extract classification text from events
   - Integrated classification functionality directly into the Event model
   - Added static methods for training the classifier

3. **API Routes** (`server/routes/events.js`)
   - `/api/events/:id/classify` - Classify a specific event
   - `/api/events/:id/categories` - Get top categories for an event
   - `/api/events/train-classifier` - Train the classifier with existing events

4. **Host Routes Integration** (`server/routes/host.js`)
   - Added routes for hosts to classify their own events
   - Added training route for hosts to train classifier with their events

### Frontend Components

1. **useEventClassifier Hook** (`client/src/hooks/useEventClassifier.js`)
   - React hook for easy integration of classification functionality
   - Handles API calls and loading states

2. **Host Dashboard Integration** (`client/src/pages/HostDashboard.jsx`)
   - Added auto-classification option during event creation
   - Added manual classification buttons for existing events

## How It Works

### Training Process

1. The classifier is trained with sample data covering various event categories
2. Each training sample consists of text (event description/tags) and a category label
3. The classifier calculates word probabilities for each category
4. The trained model is saved for later use

### Classification Process

1. When classifying an event, the system extracts text from:
   - Event title
   - Event description
   - Event tags
   - Current category (if any)

2. For each category, it calculates:
   - P(category) - Prior probability of the category
   - P(word|category) - Probability of each word given the category
   - P(category|words) - Posterior probability using Bayes' theorem

3. The event is assigned to the category with the highest probability

## Usage Examples

### Auto-classify during event creation:
```javascript
// In HostDashboard.jsx
const newEvent = {
  // ... event data
  autoClassify: true
};
```

### Manual classification:
```javascript
// Using the hook
const { classifyEvent } = useEventClassifier();
const result = await classifyEvent(eventId);
console.log(result.category, result.confidence);
```

### Get top categories:
```javascript
// Using the hook
const { getEventCategories } = useEventClassifier();
const categories = await getEventCategories(eventId);
// Returns array of { category, probability }
```

### Train classifier:
```javascript
// Using the hook (admin only)
const { trainClassifier } = useEventClassifier();
const result = await trainClassifier();
```

## Categories

The classifier currently supports these categories:
- Technology
- Business
- Arts
- Science
- Sports
- Education
- Health
- Entertainment
- Social
- Other

## Model Persistence

The trained model is saved to `server/data/eventClassifierModel.json` and automatically loaded when the application starts.

## Extending the Classifier

To add new categories:
1. Add the category to the `categories` array in `BayesianClassifier`
2. Add training data for the new category
3. Retrain the classifier

To improve accuracy:
1. Add more training data
2. Adjust the text preprocessing (tokenization)
3. Modify the feature extraction process
4. Fine-tune the smoothing parameters

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events/:id/classify` | POST | Classify an event |
| `/api/events/:id/categories` | GET | Get top categories for an event |
| `/api/events/train-classifier` | POST | Train classifier (admin only) |
| `/api/host/events/:id/classify` | POST | Classify event (host only) |
| `/api/host/events/train-classifier` | POST | Train classifier with host events |

## Training Script

A sample training script is available at `server/scripts/trainEventClassifier.js` which demonstrates:
- How to train the classifier with sample data
- How to test the classifier with sample inputs
- How to save the trained model