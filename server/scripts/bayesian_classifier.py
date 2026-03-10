import json
import math
import os
from collections import defaultdict
from typing import List, Dict, Tuple, Any

class BayesianClassifier:
    def __init__(self):
        # Categories we want to classify events into
        self.categories = [
            'Technology', 
            'Business', 
            'Arts', 
            'Science', 
            'Sports', 
            'Education', 
            'Health', 
            'Entertainment',
            'Social',
            'Other'
        ]
        
        # Training data storage
        self.category_word_counts = {}
        self.category_document_counts = {}
        self.word_counts = {}
        self.total_documents = 0
        
        # Initialize data structures for each category
        for category in self.categories:
            self.category_word_counts[category] = defaultdict(int)
            self.category_document_counts[category] = 0
            
        self.word_counts = defaultdict(int)
    
    def tokenize(self, text: str) -> List[str]:
        """Tokenize text into words"""
        if not text:
            return []
        # Convert to lowercase, remove punctuation, split by whitespace
        words = text.lower().replace(',', ' ').replace('.', ' ').replace('!', ' ').replace('?', ' ').split()
        # Filter out very short words
        return [word for word in words if len(word) > 2]
    
    def train(self, text: str, category: str) -> None:
        """Train the classifier with labeled data"""
        if category not in self.categories:
            raise ValueError(f"Unknown category: {category}")
            
        words = self.tokenize(text)
        self.total_documents += 1
        
        # Increment document count for this category
        self.category_document_counts[category] += 1
        
        # Count words for this category
        for word in words:
            # Increment word count in category
            self.category_word_counts[category][word] += 1
            # Increment overall word count
            self.word_counts[word] += 1
    
    def word_probability(self, word: str, category: str) -> float:
        """Calculate probability of a word given a category P(word|category)"""
        word_count_in_category = self.category_word_counts[category][word]
        total_words_in_category = sum(self.category_word_counts[category].values())
        
        # Use Laplace smoothing to avoid zero probabilities
        # Fix potential division by zero
        vocab_size = len(self.word_counts) if self.word_counts else 1
        return (word_count_in_category + 1) / (total_words_in_category + vocab_size)
    
    def category_probability(self, category: str) -> float:
        """Calculate probability of a category P(category)"""
        if self.total_documents == 0:
            return 0
        return self.category_document_counts[category] / self.total_documents
    
    def classify(self, text: str) -> Dict[str, Any]:
        """Classify text into the most likely category"""
        words = self.tokenize(text)
        scores = {}
        
        # Calculate score for each category
        for category in self.categories:
            # Start with log probability of category
            score = math.log(self.category_probability(category)) if self.category_probability(category) > 0 else 0
            
            # Add log probabilities of words
            for word in words:
                score += math.log(self.word_probability(word, category))
                
            scores[category] = score
        
        # Find category with highest score
        best_category = max(scores.keys(), key=lambda x: scores[x])
        best_score = scores[best_category]
        
        # Convert to probabilities using softmax
        probabilities = self.softmax(scores)
        
        return {
            'category': best_category,
            'confidence': probabilities[best_category]
        }
    
    def get_top_categories(self, text: str, n: int = 3) -> List[Dict[str, float]]:
        """Get top N categories with their probabilities"""
        words = self.tokenize(text)
        scores = {}
        
        # Calculate score for each category
        for category in self.categories:
            # Start with log probability of category
            score = math.log(self.category_probability(category)) if self.category_probability(category) > 0 else 0
            
            # Add log probabilities of words
            for word in words:
                score += math.log(self.word_probability(word, category))
                
            scores[category] = score
        
        # Convert to probabilities and sort
        probabilities = self.softmax(scores)
        sorted_categories = [
            {'category': category, 'probability': probability}
            for category, probability in sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return sorted_categories[:n]
    
    def softmax(self, scores: Dict[str, float]) -> Dict[str, float]:
        """Apply softmax to convert scores to probabilities"""
        if not scores:
            return {}
        max_score = max(scores.values())
        exp_scores = {}
        total = 0
        
        # Calculate exponentials
        for category, score in scores.items():
            exp_scores[category] = math.exp(score - max_score)
            total += exp_scores[category]
        
        # Normalize
        probabilities = {}
        for category, exp_score in exp_scores.items():
            probabilities[category] = exp_score / total if total > 0 else 0
            
        return probabilities
    
    def save_model(self, filepath: str) -> None:
        """Save training data to a file (for persistence)"""
        model_data = {
            'categories': self.categories,
            'category_word_counts': {cat: dict(counts) for cat, counts in self.category_word_counts.items()},
            'category_document_counts': self.category_document_counts,
            'word_counts': dict(self.word_counts),
            'total_documents': self.total_documents
        }
        with open(filepath, 'w') as f:
            json.dump(model_data, f)
    
    def load_model(self, filepath: str) -> None:
        """Load training data from a file"""
        if not os.path.exists(filepath):
            print(f"Model file not found: {filepath}")
            return
            
        with open(filepath, 'r') as f:
            model_data = json.load(f)
            
        self.categories = model_data['categories']
        # Handle both Python and JavaScript model formats
        if 'category_word_counts' in model_data:
            # Python format
            self.category_word_counts = {cat: defaultdict(int, counts) for cat, counts in model_data['category_word_counts'].items()}
        elif 'categoryWordCounts' in model_data:
            # JavaScript format
            self.category_word_counts = {cat: defaultdict(int, counts) for cat, counts in model_data['categoryWordCounts'].items()}
        else:
            self.category_word_counts = {cat: defaultdict(int) for cat in self.categories}
        
        if 'category_document_counts' in model_data:
            # Python format
            self.category_document_counts = model_data['category_document_counts']
        elif 'categoryDocumentCounts' in model_data:
            # JavaScript format
            self.category_document_counts = model_data['categoryDocumentCounts']
        else:
            self.category_document_counts = {cat: 0 for cat in self.categories}
            
        if 'word_counts' in model_data:
            # Python format
            self.word_counts = defaultdict(int, model_data['word_counts'])
        elif 'wordCounts' in model_data:
            # JavaScript format
            self.word_counts = defaultdict(int, model_data['wordCounts'])
        else:
            self.word_counts = defaultdict(int)
            
        if 'total_documents' in model_data:
            # Python format
            self.total_documents = model_data['total_documents']
        elif 'totalDocuments' in model_data:
            # JavaScript format
            self.total_documents = model_data['totalDocuments']
        else:
            self.total_documents = 0

def main():
    """Main function to demonstrate the classifier"""
    # Sample training data
    training_data = [
        # Technology events
        {
            "text": "Learn the latest in artificial intelligence and machine learning. Workshop on neural networks and deep learning algorithms.",
            "category": "Technology"
        },
        {
            "text": "Web development bootcamp covering React, Node.js, and modern JavaScript frameworks. Build full-stack applications.",
            "category": "Technology"
        },
        {
            "text": "Cybersecurity conference with experts discussing the latest threats and protection strategies for businesses.",
            "category": "Technology"
        },
        {
            "text": "Mobile app development workshop for iOS and Android platforms. Learn to create cross-platform applications.",
            "category": "Technology"
        },
        {
            "text": "Cloud computing seminar covering AWS, Azure, and Google Cloud services for enterprise solutions.",
            "category": "Technology"
        },

        # Business events
        {
            "text": "Entrepreneurship summit with successful founders sharing their startup journey and funding strategies.",
            "category": "Business"
        },
        {
            "text": "Financial planning workshop for young professionals. Learn about investments, savings, and retirement planning.",
            "category": "Business"
        },
        {
            "text": "Marketing conference focusing on digital marketing trends, social media strategies, and brand building.",
            "category": "Business"
        },
        {
            "text": "Leadership development program for managers. Improve team management and organizational skills.",
            "category": "Business"
        },
        {
            "text": "E-commerce webinar on building online stores, payment processing, and customer acquisition strategies.",
            "category": "Business"
        },

        # Arts events
        {
            "text": "Photography exhibition featuring local artists. Workshop on composition and lighting techniques.",
            "category": "Arts"
        },
        {
            "text": "Music concert with classical orchestra performances. Experience symphonies and chamber music.",
            "category": "Arts"
        },
        {
            "text": "Painting workshop for beginners. Learn watercolor techniques and color theory from professional artists.",
            "category": "Arts"
        },
        {
            "text": "Theater performance of Shakespeare's classic plays. Experience live drama and storytelling.",
            "category": "Arts"
        },
        {
            "text": "Dance recital featuring contemporary and traditional dance forms. Choreography workshop included.",
            "category": "Arts"
        },

        # Science events
        {
            "text": "Astronomy night with telescope viewing of planets and stars. Learn about the solar system and galaxies.",
            "category": "Science"
        },
        {
            "text": "Biology seminar on genetic engineering and CRISPR technology. Explore the future of medicine.",
            "category": "Science"
        },
        {
            "text": "Physics workshop on quantum mechanics and particle physics. Understand the fundamental laws of nature.",
            "category": "Science"
        },
        {
            "text": "Environmental science conference on climate change solutions. Discuss renewable energy and conservation.",
            "category": "Science"
        },
        {
            "text": "Chemistry demonstration show with exciting experiments. Learn about chemical reactions and properties.",
            "category": "Science"
        },

        # Sports events
        {
            "text": "Football tournament for college teams. Compete for the championship trophy and prizes.",
            "category": "Sports"
        },
        {
            "text": "Yoga and meditation workshop for stress relief. Learn breathing techniques and mindfulness practices.",
            "category": "Sports"
        },
        {
            "text": "Marathon running event through city streets. Charity run to support local community causes.",
            "category": "Sports"
        },
        {
            "text": "Basketball clinic with professional coaches. Improve your shooting, dribbling, and defensive skills.",
            "category": "Sports"
        },
        {
            "text": "Swimming competition at the local pool. Open to all skill levels from beginners to advanced.",
            "category": "Sports"
        },

        # Education events
        {
            "text": "Study skills workshop for students. Learn effective note-taking, time management, and exam preparation.",
            "category": "Education"
        },
        {
            "text": "Language learning meetup for Spanish conversation practice. Improve your speaking and listening skills.",
            "category": "Education"
        },
        {
            "text": "Career counseling seminar for college graduates. Explore job opportunities and interview techniques.",
            "category": "Education"
        },
        {
            "text": "Online course on data science and analytics. Learn Python, R, and statistical analysis methods.",
            "category": "Education"
        },
        {
            "text": "Academic research conference with paper presentations. Share findings in various fields of study.",
            "category": "Education"
        },

        # Health events
        {
            "text": "Nutrition workshop on healthy eating habits. Learn about balanced diets and meal planning.",
            "category": "Health"
        },
        {
            "text": "Mental health awareness seminar with licensed therapists. Discuss anxiety, depression, and coping strategies.",
            "category": "Health"
        },
        {
            "text": "Fitness bootcamp with high-intensity workouts. Get in shape with professional trainers.",
            "category": "Health"
        },
        {
            "text": "Medical conference on advances in healthcare technology. Learn about new treatments and procedures.",
            "category": "Health"
        },
        {
            "text": "Wellness retreat focusing on holistic health. Experience spa treatments and mindfulness activities.",
            "category": "Health"
        },

        # Entertainment events
        {
            "text": "Comedy show featuring stand-up comedians. Enjoy an evening of laughter and entertainment.",
            "category": "Entertainment"
        },
        {
            "text": "Movie screening of the latest blockbuster film. Popcorn and refreshments provided.",
            "category": "Entertainment"
        },
        {
            "text": "Game night with board games and card tournaments. Socialize and compete with friends.",
            "category": "Entertainment"
        },
        {
            "text": "Karaoke party with private rooms. Sing your favorite songs with friends and family.",
            "category": "Entertainment"
        },
        {
            "text": "Festival with food vendors, live music, and cultural performances. Celebrate local traditions.",
            "category": "Entertainment"
        },

        # Social events
        {
            "text": "Networking meetup for professionals in the tech industry. Exchange business cards and build connections.",
            "category": "Social"
        },
        {
            "text": "Community volunteer day for local charity organizations. Help with food drives and cleanup efforts.",
            "category": "Social"
        },
        {
            "text": "Book club discussion on the latest bestsellers. Share your thoughts and recommendations.",
            "category": "Social"
        },
        {
            "text": "Cultural exchange event with international students. Experience different traditions and cuisines.",
            "category": "Social"
        },
        {
            "text": "Fundraising gala for local schools and educational programs. Support community development initiatives.",
            "category": "Social"
        }
    ]
    
    # Train the classifier
    classifier = BayesianClassifier()
    
    print("Training Bayesian classifier with sample data...")
    for i, data in enumerate(training_data):
        classifier.train(data["text"], data["category"])
        if (i + 1) % 10 == 0:
            print(f"Trained {i + 1}/{len(training_data)} samples")
    
    print("Training completed!")
    
    # Test the classifier with some examples
    print("\nTesting classifier with sample inputs:")
    
    test_inputs = [
        "Learn to code in Python and build machine learning models",
        "Investment strategies for retirement planning",
        "Photography workshop on portrait lighting techniques",
        "Research seminar on quantum computing advances",
        "Basketball skills clinic with professional coaches",
        "Study techniques for exam preparation and time management"
    ]
    
    for input_text in test_inputs:
        result = classifier.classify(input_text)
        top_categories = classifier.get_top_categories(input_text, 3)
        
        print(f"\nInput: \"{input_text}\"")
        print(f"Predicted category: {result['category']} (confidence: {result['confidence'] * 100:.2f}%)")
        print("Top categories:")
        for cat in top_categories:
            print(f"  {cat['category']}: {cat['probability'] * 100:.2f}%")
    
    # Save the trained model
    model_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'eventClassifierModel.json')
    
    # Ensure data directory exists
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    classifier.save_model(model_path)
    print(f"\nModel saved to: {model_path}")
    
    print("\nClassifier training script completed successfully!")

if __name__ == "__main__":
    main()