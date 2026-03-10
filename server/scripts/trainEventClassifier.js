/**
 * Script to train the event classifier with sample data
 *
 * This script demonstrates how to train the Bayesian classifier with sample events
 * to automatically categorize new events based on their descriptions and tags.
 */

const BayesianClassifier = require('../utils/bayesianClassifier');

// Sample training data
const trainingData = [
  // Technology events
  {
    text: 'Learn the latest in artificial intelligence and machine learning. Workshop on neural networks and deep learning algorithms.',
    category: 'Technology',
  },
  {
    text: 'Web development bootcamp covering React, Node.js, and modern JavaScript frameworks. Build full-stack applications.',
    category: 'Technology',
  },
  {
    text: 'Cybersecurity conference with experts discussing the latest threats and protection strategies for businesses.',
    category: 'Technology',
  },
  {
    text: 'Mobile app development workshop for iOS and Android platforms. Learn to create cross-platform applications.',
    category: 'Technology',
  },
  {
    text: 'Cloud computing seminar covering AWS, Azure, and Google Cloud services for enterprise solutions.',
    category: 'Technology',
  },

  // Business events
  {
    text: 'Entrepreneurship summit with successful founders sharing their startup journey and funding strategies.',
    category: 'Business',
  },
  {
    text: 'Financial planning workshop for young professionals. Learn about investments, savings, and retirement planning.',
    category: 'Business',
  },
  {
    text: 'Marketing conference focusing on digital marketing trends, social media strategies, and brand building.',
    category: 'Business',
  },
  {
    text: 'Leadership development program for managers. Improve team management and organizational skills.',
    category: 'Business',
  },
  {
    text: 'E-commerce webinar on building online stores, payment processing, and customer acquisition strategies.',
    category: 'Business',
  },

  // Arts events
  {
    text: 'Photography exhibition featuring local artists. Workshop on composition and lighting techniques.',
    category: 'Arts',
  },
  {
    text: 'Music concert with classical orchestra performances. Experience symphonies and chamber music.',
    category: 'Arts',
  },
  {
    text: 'Painting workshop for beginners. Learn watercolor techniques and color theory from professional artists.',
    category: 'Arts',
  },
  {
    text: "Theater performance of Shakespeare's classic plays. Experience live drama and storytelling.",
    category: 'Arts',
  },
  {
    text: 'Dance recital featuring contemporary and traditional dance forms. Choreography workshop included.',
    category: 'Arts',
  },

  // Science events
  {
    text: 'Astronomy night with telescope viewing of planets and stars. Learn about the solar system and galaxies.',
    category: 'Science',
  },
  {
    text: 'Biology seminar on genetic engineering and CRISPR technology. Explore the future of medicine.',
    category: 'Science',
  },
  {
    text: 'Physics workshop on quantum mechanics and particle physics. Understand the fundamental laws of nature.',
    category: 'Science',
  },
  {
    text: 'Environmental science conference on climate change solutions. Discuss renewable energy and conservation.',
    category: 'Science',
  },
  {
    text: 'Chemistry demonstration show with exciting experiments. Learn about chemical reactions and properties.',
    category: 'Science',
  },

  // Sports events
  {
    text: 'Football tournament for college teams. Compete for the championship trophy and prizes.',
    category: 'Sports',
  },
  {
    text: 'Yoga and meditation workshop for stress relief. Learn breathing techniques and mindfulness practices.',
    category: 'Sports',
  },
  {
    text: 'Marathon running event through city streets. Charity run to support local community causes.',
    category: 'Sports',
  },
  {
    text: 'Basketball clinic with professional coaches. Improve your shooting, dribbling, and defensive skills.',
    category: 'Sports',
  },
  {
    text: 'Swimming competition at the local pool. Open to all skill levels from beginners to advanced.',
    category: 'Sports',
  },

  // Education events
  {
    text: 'Study skills workshop for students. Learn effective note-taking, time management, and exam preparation.',
    category: 'Education',
  },
  {
    text: 'Language learning meetup for Spanish conversation practice. Improve your speaking and listening skills.',
    category: 'Education',
  },
  {
    text: 'Career counseling seminar for college graduates. Explore job opportunities and interview techniques.',
    category: 'Education',
  },
  {
    text: 'Online course on data science and analytics. Learn Python, R, and statistical analysis methods.',
    category: 'Education',
  },
  {
    text: 'Academic research conference with paper presentations. Share findings in various fields of study.',
    category: 'Education',
  },

  // Health events
  {
    text: 'Nutrition workshop on healthy eating habits. Learn about balanced diets and meal planning.',
    category: 'Health',
  },
  {
    text: 'Mental health awareness seminar with licensed therapists. Discuss anxiety, depression, and coping strategies.',
    category: 'Health',
  },
  {
    text: 'Fitness bootcamp with high-intensity workouts. Get in shape with professional trainers.',
    category: 'Health',
  },
  {
    text: 'Medical conference on advances in healthcare technology. Learn about new treatments and procedures.',
    category: 'Health',
  },
  {
    text: 'Wellness retreat focusing on holistic health. Experience spa treatments and mindfulness activities.',
    category: 'Health',
  },

  // Entertainment events
  {
    text: 'Comedy show featuring stand-up comedians. Enjoy an evening of laughter and entertainment.',
    category: 'Entertainment',
  },
  {
    text: 'Movie screening of the latest blockbuster film. Popcorn and refreshments provided.',
    category: 'Entertainment',
  },
  {
    text: 'Game night with board games and card tournaments. Socialize and compete with friends.',
    category: 'Entertainment',
  },
  {
    text: 'Karaoke party with private rooms. Sing your favorite songs with friends and family.',
    category: 'Entertainment',
  },
  {
    text: 'Festival with food vendors, live music, and cultural performances. Celebrate local traditions.',
    category: 'Entertainment',
  },

  // Social events
  {
    text: 'Networking meetup for professionals in the tech industry. Exchange business cards and build connections.',
    category: 'Social',
  },
  {
    text: 'Community volunteer day for local charity organizations. Help with food drives and cleanup efforts.',
    category: 'Social',
  },
  {
    text: 'Book club discussion on the latest bestsellers. Share your thoughts and recommendations.',
    category: 'Social',
  },
  {
    text: 'Cultural exchange event with international students. Experience different traditions and cuisines.',
    category: 'Social',
  },
  {
    text: 'Fundraising gala for local schools and educational programs. Support community development initiatives.',
    category: 'Social',
  },
];

// Train the classifier
const classifier = new BayesianClassifier();

console.log('Training Bayesian classifier with sample data...');
trainingData.forEach((data, index) => {
  classifier.train(data.text, data.category);
  if ((index + 1) % 10 === 0) {
    console.log(`Trained ${index + 1}/${trainingData.length} samples`);
  }
});

console.log('Training completed!');

// Test the classifier with some examples
console.log('\nTesting classifier with sample inputs:');

const testInputs = [
  'Learn to code in Python and build machine learning models',
  'Investment strategies for retirement planning',
  'Photography workshop on portrait lighting techniques',
  'Research seminar on quantum computing advances',
  'Basketball skills clinic with professional coaches',
  'Study techniques for exam preparation and time management',
];

testInputs.forEach((input) => {
  const result = classifier.classify(input);
  const topCategories = classifier.getTopCategories(input, 3);

  console.log(`\nInput: "${input}"`);
  console.log(
    `Predicted category: ${result.category} (confidence: ${(result.confidence * 100).toFixed(2)}%)`,
  );
  console.log('Top categories:');
  topCategories.forEach((cat) => {
    console.log(`  ${cat.category}: ${(cat.probability * 100).toFixed(2)}%`);
  });
});

// Save the trained model
const path = require('path');
const modelPath = path.join(__dirname, '..', 'data', 'eventClassifierModel.json');

try {
  // Ensure data directory exists
  const fs = require('fs');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  classifier.saveModel(modelPath);
  console.log(`\nModel saved to: ${modelPath}`);
} catch (err) {
  console.error('Error saving model:', err);
}

console.log('\nClassifier training script completed successfully!');
