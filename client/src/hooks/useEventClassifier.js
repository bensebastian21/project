import { useState } from 'react';
import config from '../config';

const useEventClassifier = () => {
  const [classifying, setClassifying] = useState(false);
  const [categories, setCategories] = useState([]);

  const classifyEvent = async (eventId) => {
    setClassifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiBaseUrl}/api/events/${eventId}/classify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to classify event');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error classifying event:', error);
      throw error;
    } finally {
      setClassifying(false);
    }
  };

  const getEventCategories = async (eventId) => {
    setClassifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiBaseUrl}/api/events/${eventId}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get event categories');
      }

      const data = await response.json();
      setCategories(data.categories);
      return data.categories;
    } catch (error) {
      console.error('Error getting event categories:', error);
      throw error;
    } finally {
      setClassifying(false);
    }
  };

  const trainClassifier = async () => {
    setClassifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiBaseUrl}/api/events/train-classifier`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to train classifier');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error training classifier:', error);
      throw error;
    } finally {
      setClassifying(false);
    }
  };

  return {
    classifying,
    categories,
    classifyEvent,
    getEventCategories,
    trainClassifier,
  };
};

export default useEventClassifier;
