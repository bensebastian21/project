# KNN Implementation in Python

This document explains the KNN (K-Nearest Neighbors) implementation that was converted from JavaScript to Python for finding similar users.

## Overview

The KNN algorithm calculates similarity between users based on:
1. Institute matching (weighted higher)
2. Shared interests (weighted lower)

## Files

1. **[server/scripts/knn_friends.py](file:///d:/ben/Project/server/scripts/knn_friends.py)** - Python implementation of the KNN algorithm
2. **[server/routes/knn.js](file:///d:/ben/Project/server/routes/knn.js)** - Express route that exposes the KNN functionality via API
3. **[client/src/pages/AllFriends.jsx](file:///d:/ben/Project/client/src/pages/AllFriends.jsx)** - Frontend component that uses the KNN API

## Python Implementation

The Python script ([knn_friends.py](file:///d:/ben/Project/server/scripts/knn_friends.py)) contains two main functions:

### `calculate_similarity(user1, user2, current_user)`

Calculates similarity between two users based on:
- Institute similarity (weight: 3)
- Interests similarity (weight: 2)

Returns a normalized score between 0 and 1.

### `find_k_nearest_neighbors(current_user, all_users, k=10)`

Finds the K most similar users to the current user by:
1. Calculating similarity scores for all users
2. Sorting users by similarity (descending)
3. Returning the top K users

## API Endpoint

The KNN functionality is exposed via a POST endpoint:
```
POST /api/knn/similar-users
```

### Request Body
```json
{
  "currentUser": { /* current user object */ },
  "allUsers": [ /* array of all users */ ],
  "k": 10 /* number of similar users to return */
}
```

### Response
Array of users with added `similarity` property, sorted by similarity (descending).

## Frontend Integration

The [AllFriends.jsx](file:///d:/ben/Project/client/src/pages/AllFriends.jsx) component was updated to:
1. Remove the JavaScript KNN implementation
2. Add a function to call the KNN API endpoint
3. Display loading state while calculating similar users
4. Show similarity percentages for KNN results

## Testing

The implementation was tested with sample data and verified to work correctly:
- Users with same institute and shared interests receive high similarity scores
- Users with different institutes and no shared interests receive low similarity scores

## Benefits of Python Implementation

1. Better performance for complex calculations
2. Easier to extend with more sophisticated algorithms
3. Can leverage Python's rich ecosystem of data science libraries
4. Separation of concerns between frontend/backend logic