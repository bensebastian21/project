const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();

// POST endpoint to classify an event using Python Bayesian classifier
router.post('/classify-event', async (req, res) => {
  try {
    const { eventText } = req.body;

    if (!eventText) {
      return res.status(400).json({ error: 'eventText is required' });
    }

    // Spawn Python process
    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'classify_event.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    // Prepare input data
    const inputData = {
      event_text: eventText,
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
    console.error('Error in Bayesian classification route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint to get top categories for an event using Python Bayesian classifier
router.post('/event-categories', async (req, res) => {
  try {
    const { eventText, n = 3 } = req.body;

    if (!eventText) {
      return res.status(400).json({ error: 'eventText is required' });
    }

    // Spawn Python process
    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'get_event_categories.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    // Prepare input data
    const inputData = {
      event_text: eventText,
      n: n,
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
    console.error('Error in Bayesian categories route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint to train the classifier with events
router.post('/train-classifier', async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array is required' });
    }

    // Spawn Python process
    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'train_classifier.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    // Prepare input data
    const inputData = {
      events: events,
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
    console.error('Error in Bayesian training route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
