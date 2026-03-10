const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Event = require('../models/Event');
const { authenticateToken } = require('../utils/auth');

/**
 * GET /api/goals
 * Fetch user's goals and dynamically calculate progress based on attendance.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const studentId = req.user.id;
        const goals = await Goal.find({ studentId }).sort({ createdAt: -1 });

        // Retrieve all events the user has attended
        const attendedEvents = await Event.find({
            'registrations': {
                $elemMatch: { studentId: studentId, attended: true }
            }
        });

        // Calculate dynamic progress for each goal
        const goalsWithProgress = goals.map(goal => {
            const goalObj = goal.toObject();

            // Count attended events that match the goal category
            // If category is "Any", count all attended events.
            let progressCount = 0;
            if (goal.category === 'Any') {
                progressCount = attendedEvents.length;
            } else {
                progressCount = attendedEvents.filter(
                    e => e.category?.toLowerCase() === goal.category.toLowerCase()
                ).length;
            }

            return {
                ...goalObj,
                currentProgress: progressCount,
                isAchieved: progressCount >= goal.targetCount
            };
        });

        res.status(200).json(goalsWithProgress);
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

/**
 * POST /api/goals
 * Create a new personal goal.
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, targetCount, category } = req.body;

        if (!title || !targetCount || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newGoal = new Goal({
            studentId: req.user.id,
            title,
            targetCount,
            category
        });

        await newGoal.save();

        // Return with zero progress initially
        res.status(201).json({
            ...newGoal.toObject(),
            currentProgress: 0,
            isAchieved: false
        });
    } catch (error) {
        console.error('Error creating goal:', error);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

/**
 * DELETE /api/goals/:id
 * Delete a specific goal.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, studentId: req.user.id });
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found or unauthorized' });
        }

        await Goal.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

module.exports = router;
