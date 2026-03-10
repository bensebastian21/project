import sys
import json
import os
import csv
import re
from collections import defaultdict

def tokenize(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return text.split()

class CustomNLPModel:
    def __init__(self):
        self.categories = set()
        self.locations = set()
        self.vocab = set()
        self.category_words = defaultdict(lambda: defaultdict(int))
        self.category_totals = defaultdict(int)
        
    def train(self, csv_path):
        if not os.path.exists(csv_path):
            return
            
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                query = row['query'].lower()
                cat = row['category'].strip() if row.get('category') else None
                loc = row['location'].strip().lower() if row.get('location') else None
                
                if cat:
                    self.categories.add(cat)
                    words = tokenize(query)
                    for w in words:
                        self.category_words[cat][w] += 1
                        self.category_totals[cat] += 1
                        self.vocab.add(w)
                
                if loc:
                    self.locations.add(loc)

    def predict_category(self, query):
        if not self.categories:
            return None
            
        words = tokenize(query)
        best_cat = None
        best_score = float('-inf')
        
        vocab_size = len(self.vocab) if self.vocab else 1
        
        for cat in self.categories:
            score = 0
            for w in words:
                count = self.category_words[cat].get(w, 0)
                # Laplace smoothing
                prob = (count + 1) / (self.category_totals[cat] + vocab_size)
                import math
                score += math.log(prob)
            
            if score > best_score:
                best_score = score
                best_cat = cat
                
        # Only return category if we have some reasonable confidence (at least one word matched)
        matched_words = sum(1 for w in words if any(self.category_words[c].get(w, 0) > 0 for c in self.categories))
        if matched_words == 0:
            return None
            
        return best_cat
        
    def extract_location(self, query):
        query_lower = query.lower()
        # Sort locations by length descending to match longest first
        sorted_locs = sorted(list(self.locations), key=len, reverse=True)
        for loc in sorted_locs:
            if loc in query_lower:
                # Return title-cased location
                return loc.title()
        return None

    def extract_isFree(self, query):
        words = tokenize(query)
        if 'free' in words:
            return True
        paid_keywords = ['paid', 'ticketed', 'premium', 'cost', 'buy']
        if any(w in words for w in paid_keywords):
            return False
        return None

    def extract_dateFilter(self, query):
        words = set(tokenize(query))
        if 'today' in words: return 'today'
        if 'tomorrow' in words: return 'tomorrow'
        if 'weekend' in words: return 'weekend'
        if 'week' in words and 'next' in words: return 'next_week'
        if 'week' in words and 'this' in words: return 'this_week'
        if 'month' in words and 'this' in words: return 'this_month'
        if 'week' in words: return 'this_week'
        if 'month' in words: return 'this_month'
        return 'future'

    def extract_keywords(self, query, category, location):
        # Remove known entities to get raw keywords
        query_lower = query.lower()
        stopwords = {'in', 'at', 'on', 'for', 'to', 'the', 'a', 'an', 'is', 'are', 'this', 'next', 'free', 'paid', 'premium', 'ticketed', 'happening', 'soon', 'near', 'me', 'show', 'me', 'find', 'looking', 'want', 'attend', 'around', 'what'}
        
        words = tokenize(query_lower)
        keywords = [w for w in words if w not in stopwords]
        
        # Remove category and location words
        if category:
            cat_words = tokenize(category)
            keywords = [w for w in keywords if w not in cat_words]
            
        if location:
            loc_words = tokenize(location)
            keywords = [w for w in keywords if w not in loc_words]
            
        # Remove date words
        date_words = {'today', 'tomorrow', 'weekend', 'week', 'month', 'this', 'next'}
        keywords = [w for w in keywords if w not in date_words]
        
        return keywords

def main():
    if len(sys.argv) < 3:
        # Note: the host.js calls it with [apiKey, query]
        # We ignore apiKey because we don't use Gemini anymore.
        print('{"error": "Missing arguments"}')
        sys.exit(1)
        
    query = sys.argv[2]
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "data", "nlpTrainingData.csv")
    
    model = CustomNLPModel()
    model.train(data_path)
    
    category = model.predict_category(query)
    location = model.extract_location(query)
    isFree = model.extract_isFree(query)
    dateFilter = model.extract_dateFilter(query)
    keywords = model.extract_keywords(query, category, location)
    
    output = {
        "keywords": keywords,
        "category": category,
        "location": location,
        "isFree": isFree,
        "dateFilter": dateFilter
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
