const axios = require('axios');

async function testDecisionTreeAPI() {
  const baseURL = 'http://localhost:5000/api/decision-tree';

  try {
    // Test training endpoint
    console.log('Testing Decision Tree training endpoint...');
    const trainingData = [
      { features: [50, 0, 2, 1], label: 1 }, // Popular event
      { features: [30, 100, 3, 0], label: 0 }, // Not popular
      { features: [80, 0, 1, 1], label: 1 }, // Popular event
      { features: [20, 200, 4, 0], label: 0 }, // Not popular
      { features: [90, 0, 2, 1], label: 1 }, // Popular event
      { features: [15, 150, 3, 0], label: 0 }, // Not popular
    ];

    const trainResponse = await axios.post(`${baseURL}/train-model`, {
      training_data: trainingData,
    });

    console.log('Training response:', trainResponse.data);

    // Test prediction endpoint
    console.log('\nTesting Decision Tree prediction endpoint...');
    const predictResponse = await axios.post(`${baseURL}/predict`, {
      features: [60, 0, 2, 1], // New event to predict
    });

    console.log('Prediction response:', predictResponse.data);
  } catch (error) {
    console.error('Error testing Decision Tree API:', error.response?.data || error.message);
  }
}

testDecisionTreeAPI();
