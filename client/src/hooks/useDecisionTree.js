import { useState } from 'react';

export const useDecisionTree = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Train the Decision Tree model
  const trainModel = async (trainingData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/decision-tree/train-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ training_data: trainingData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to train model');
      }

      return result;
    } catch (err) {
      setError(err.message);
      console.error('Decision Tree training error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Make a prediction with the Decision Tree model
  const predict = async (features, modelPath = null) => {
    try {
      setLoading(true);
      setError(null);

      const payload = { features };
      if (modelPath) {
        payload.model_path = modelPath;
      }

      const response = await fetch('/api/decision-tree/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to make prediction');
      }

      return result;
    } catch (err) {
      setError(err.message);
      console.error('Decision Tree prediction error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    trainModel,
    predict,
  };
};

export default useDecisionTree;
