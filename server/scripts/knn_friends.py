import json
import sys
from collections import defaultdict
from typing import List, Dict, Any

def calculate_similarity(user1: Dict[str, Any], user2: Dict[str, Any], current_user: Dict[str, Any]) -> float:
    """
    Calculate similarity between two users based on institute and interests.
    
    Args:
        user1: First user dictionary
        user2: Second user dictionary
        current_user: Current user dictionary (for reference)
        
    Returns:
        Similarity score between 0 and 1
    """
    similarity_score = 0.0
    total_weight = 0.0
    
    # Institute similarity (weight: 3)
    if (user1.get('institute') and user2.get('institute') and 
        user1['institute'] == user2['institute']):
        similarity_score += 3.0
    total_weight += 3.0
    
    # Interests similarity (weight: 2)
    interests1 = set(str(i).lower() for i in user1.get('interests', []) if i)
    interests2 = set(str(i).lower() for i in user2.get('interests', []) if i)
    
    shared_interests = len(interests1.intersection(interests2))
    total_interests = len(interests1.union(interests2))
    
    if total_interests > 0:
        similarity_score += 2.0 * (shared_interests / total_interests)
    total_weight += 2.0
    
    # Normalize the score to 0-1 range
    return similarity_score / total_weight if total_weight > 0 else 0.0

def find_k_nearest_neighbors(current_user: Dict[str, Any], all_users: List[Dict[str, Any]], k: int = 10) -> List[Dict[str, Any]]:
    """
    Find K nearest neighbors for the current user.
    
    Args:
        current_user: The user to find similar users for
        all_users: List of all users to compare against
        k: Number of nearest neighbors to return
        
    Returns:
        List of users with similarity scores, sorted by similarity (descending)
    """
    # Calculate similarity scores for all users
    scored_users = []
    for user in all_users:
        # Skip the current user
        if str(user.get('_id', '')) == str(current_user.get('_id', '')):
            continue
            
        similarity = calculate_similarity(current_user, user, current_user)
        user_with_similarity = user.copy()
        user_with_similarity['similarity'] = similarity
        scored_users.append(user_with_similarity)
    
    # Sort by similarity (descending)
    scored_users.sort(key=lambda x: x['similarity'], reverse=True)
    
    # Return top k users
    return scored_users[:k]

def main():
    """
    Main function to process input and output KNN results.
    Expects JSON input via stdin with current_user and all_users.
    """
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)
        
        current_user = input_data['current_user']
        all_users = input_data['all_users']
        k = input_data.get('k', 10)
        
        # Find similar users
        similar_users = find_k_nearest_neighbors(current_user, all_users, k)
        
        # Output results as JSON
        print(json.dumps(similar_users))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()