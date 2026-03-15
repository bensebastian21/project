const mongoose = require('mongoose');

const promptTemplateSchema = new mongoose.Schema({
  templateId: { type: String, required: true, unique: true },
  promptText: { type: String, required: true },
  tone: {
    type: String,
    enum: ['Professional', 'Hype', 'Academic'],
    required: true,
  },
  avgViralScore: { type: Number, default: 0 },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

promptTemplateSchema.index({ tone: 1, avgViralScore: -1 });

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
