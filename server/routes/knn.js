const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();

// POST endpoint to get similar users using KNN
router.post('/similar-users', async (req, res) => {
  try {
    const { currentUser, allUsers, k = 10 } = req.body;

    if (!currentUser || !allUsers) {
      return res.status(400).json({ error: 'currentUser and allUsers are required' });
    }

    // Spawn Python process
    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'knn_friends.py');
    const pythonProcess = spawn('python', [pythonScriptPath]);

    // Prepare input data
    const inputData = {
      current_user: currentUser,
      all_users: allUsers,
      k: k,
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
        const similarUsers = JSON.parse(pythonOutput);
        res.json(similarUsers);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Raw output:', pythonOutput);
        res.status(500).json({ error: 'Failed to parse Python output' });
      }
    });
  } catch (error) {
    console.error('Error in KNN route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
