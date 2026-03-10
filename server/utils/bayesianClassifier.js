/**
 * Bayesian Classifier for Event Categorization
 *
 * This module implements a Naive Bayes classifier to automatically categorize events
 * based on their descriptions, tags, and historical data.
 */

class BayesianClassifier {
  constructor() {
    // Categories we want to classify events into
    this.categories = [
      'Technology',
      'Business',
      'Arts',
      'Science',
      'Sports',
      'Education',
      'Health',
      'Entertainment',
      'Social',
      'Other',
    ];

    // Training data storage
    this.categoryWordCounts = {};
    this.categoryDocumentCounts = {};
    this.wordCounts = {}; // This needs to be populated
    this.totalDocuments = 0;

    // Initialize data structures for each category
    this.categories.forEach((category) => {
      this.categoryWordCounts[category] = {};
      this.categoryDocumentCounts[category] = 0;
    });
  }

  /**
   * Tokenize text into words
   * @param {string} text - Text to tokenize
   * @returns {Array} Array of words
   */
  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2); // Filter out very short words
  }

  /**
   * Train the classifier with labeled data
   * @param {string} text - Event description or combined text
   * @param {string} category - The category this text belongs to
   */
  train(text, category) {
    if (!this.categories.includes(category)) {
      throw new Error(`Unknown category: ${category}`);
    }

    const words = this.tokenize(text);
    this.totalDocuments++;

    // Increment document count for this category
    this.categoryDocumentCounts[category]++;

    // Count words for this category
    words.forEach((word) => {
      // Increment word count in category
      if (!this.categoryWordCounts[category][word]) {
        this.categoryWordCounts[category][word] = 0;
      }
      this.categoryWordCounts[category][word]++;

      // Increment overall word count
      if (!this.wordCounts[word]) {
        this.wordCounts[word] = 0;
      }
      this.wordCounts[word]++;
    });
  }

  /**
   * Calculate probability of a word given a category P(word|category)
   * @param {string} word - The word
   * @param {string} category - The category
   * @returns {number} Probability
   */
  wordProbability(word, category) {
    const wordCountInCategory = this.categoryWordCounts[category][word] || 0;
    const totalWordsInCategory = Object.values(this.categoryWordCounts[category]).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Use Laplace smoothing to avoid zero probabilities
    return (wordCountInCategory + 1) / (totalWordsInCategory + Object.keys(this.wordCounts).length);
  }

  /**
   * Calculate probability of a category P(category)
   * @param {string} category - The category
   * @returns {number} Probability
   */
  categoryProbability(category) {
    return (this.categoryDocumentCounts[category] || 0) / this.totalDocuments;
  }

  /**
   * Classify text into the most likely category
   * @param {string} text - Text to classify
   * @returns {Object} Object with category and probability
   */
  classify(text) {
    const words = this.tokenize(text);
    const scores = {};

    // Calculate score for each category
    this.categories.forEach((category) => {
      // Start with log probability of category
      let score = Math.log(this.categoryProbability(category));

      // Add log probabilities of words
      words.forEach((word) => {
        score += Math.log(this.wordProbability(word, category));
      });

      scores[category] = score;
    });

    // Find category with highest score
    let bestCategory = this.categories[0];
    let bestScore = scores[bestCategory];

    for (const category in scores) {
      if (scores[category] > bestScore) {
        bestScore = scores[category];
        bestCategory = category;
      }
    }

    return {
      category: bestCategory,
      confidence: this.softmax(scores)[bestCategory],
    };
  }

  /**
   * Apply softmax to convert scores to probabilities
   * @param {Object} scores - Category scores
   * @returns {Object} Probabilities for each category
   */
  softmax(scores) {
    const maxScore = Math.max(...Object.values(scores));
    const expScores = {};
    let sum = 0;

    // Calculate exponentials
    for (const category in scores) {
      expScores[category] = Math.exp(scores[category] - maxScore);
      sum += expScores[category];
    }

    // Normalize
    const probabilities = {};
    for (const category in expScores) {
      probabilities[category] = expScores[category] / sum;
    }

    return probabilities;
  }

  /**
   * Get top N categories with their probabilities
   * @param {string} text - Text to classify
   * @param {number} n - Number of top categories to return
   * @returns {Array} Array of categories with probabilities
   */
  getTopCategories(text, n = 3) {
    const words = this.tokenize(text);
    const scores = {};

    // Calculate score for each category
    this.categories.forEach((category) => {
      // Start with log probability of category
      let score = Math.log(this.categoryProbability(category));

      // Add log probabilities of words
      words.forEach((word) => {
        score += Math.log(this.wordProbability(word, category));
      });

      scores[category] = score;
    });

    // Convert to probabilities and sort
    const probabilities = this.softmax(scores);
    const sortedCategories = Object.keys(probabilities)
      .map((category) => ({
        category,
        probability: probabilities[category],
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, n);

    return sortedCategories;
  }

  /**
   * Save training data to a file (for persistence)
   * @param {string} filepath - Path to save data
   */
  saveModel(filepath) {
    const fs = require('fs');
    const modelData = {
      categories: this.categories,
      categoryWordCounts: this.categoryWordCounts,
      categoryDocumentCounts: this.categoryDocumentCounts,
      wordCounts: this.wordCounts,
      totalDocuments: this.totalDocuments,
    };
    fs.writeFileSync(filepath, JSON.stringify(modelData));
  }

  /**
   * Load training data from a file
   * @param {string} filepath - Path to load data from
   */
  loadModel(filepath) {
    const fs = require('fs');
    if (!fs.existsSync(filepath)) {
      console.warn(`Model file not found: ${filepath}`);
      return;
    }

    const modelData = JSON.parse(fs.readFileSync(filepath));
    this.categories = modelData.categories;
    this.categoryWordCounts = modelData.categoryWordCounts;
    this.categoryDocumentCounts = modelData.categoryDocumentCounts;
    this.wordCounts = modelData.wordCounts;
    this.totalDocuments = modelData.totalDocuments;
  }
}

module.exports = BayesianClassifier;
