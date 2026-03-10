const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();

// POST endpoint to train the Decision Tree model
router.post('/train-model', async (req, res) => {
  try {
    const { training_data } = req.body;

    if (!training_data || !Array.isArray(training_data)) {
      return res.status(400).json({ error: 'training_data array is required' });
    }

    // Spawn Python process
    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'train_decision_tree.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    // Prepare input data
    const inputData = {
      training_data: training_data,
    };

    // Send data to Python script
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    let pythonOutput = '';
    let pythonError = '';

    // Collect output from Python script
    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    // Collect errors from Python script
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Error: ${pythonError}`);
        return res.status(500).json({ error: `Python script failed: ${pythonError}` });
      }

      try {
        const result = JSON.parse(pythonOutput);
        res.json(result);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Raw output:', pythonOutput);
        res.status(500).json({ error: 'Failed to parse Python output' });
      }
    });
  } catch (error) {
    console.error('Error in Decision Tree training route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint to make predictions with the Decision Tree model
router.post('/predict', async (req, res) => {
  try {
    const { features, model_path } = req.body;

    if (!features || !Array.isArray(features)) {
      return res.status(400).json({ error: 'features array is required' });
    }

    // Spawn Python process
    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'predict_decision_tree.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    // Prepare input data
    const inputData = {
      features: features,
      model_path: model_path || 'decision_tree_model.json',
    };

    // Send data to Python script
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    let pythonOutput = '';
    let pythonError = '';

    // Collect output from Python script
    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    // Collect errors from Python script
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Error: ${pythonError}`);
        return res.status(500).json({ error: `Python script failed: ${pythonError}` });
      }

      try {
        const result = JSON.parse(pythonOutput);
        res.json(result);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Raw output:', pythonOutput);
        res.status(500).json({ error: 'Failed to parse Python output' });
      }
    });
  } catch (error) {
    console.error('Error in Decision Tree prediction route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
