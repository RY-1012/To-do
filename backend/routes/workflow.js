const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Workflow = require('../models/Workflow');

// Get user's workflow data
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId || (req.user && req.user.id);
    let workflow = await Workflow.findOne({ user: userId });
    if (!workflow) {
      workflow = await Workflow.create({ user: userId, tasks: [], connections: [] });
    }
    res.json(workflow);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update user's workflow data
router.post('/', auth, async (req, res) => {
  const { tasks, connections } = req.body;
  try {
    const userId = req.userId || (req.user && req.user.id);
    let workflow = await Workflow.findOne({ user: userId });
    if (workflow) {
      workflow.tasks = tasks;
      workflow.connections = connections;
      await workflow.save();
    } else {
      workflow = await Workflow.create({
        user: userId,
        tasks,
        connections
      });
    }
    res.json(workflow);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
