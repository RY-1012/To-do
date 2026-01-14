const mongoose = require('mongoose');

const WorkflowSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tasks: [{
    id: String,
    title: String,
    emoji: String,
    description: String,
    x: Number,
    y: Number
  }],
  connections: [{
    from: String,
    to: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Workflow', WorkflowSchema);
