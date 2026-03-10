const mongoose = require('mongoose');

const elementPositions = new mongoose.Schema({
  x: { type: Number, default: 50 }, // Percentage from left
  y: { type: Number, default: 50 }, // Percentage from top
  fontSize: { type: Number, default: 24 }, // in px
  color: { type: String, default: '#000000' },
  visible: { type: Boolean, default: true },
});

const certificateTemplateSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    unique: true,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  backgroundUrl: { type: String, default: '' },
  signatureUrl: { type: String, default: '' },

  // Element positioning and styling
  studentName: {
    type: elementPositions,
    default: () => ({ x: 50, y: 40, fontSize: 32, color: '#000000', visible: true }),
  },
  eventName: {
    type: elementPositions,
    default: () => ({ x: 50, y: 55, fontSize: 24, color: '#000000', visible: true }),
  },
  date: {
    type: elementPositions,
    default: () => ({ x: 50, y: 65, fontSize: 18, color: '#000000', visible: true }),
  },
  signature: {
    type: elementPositions,
    // width and height are specific to images
    default: () => ({ x: 80, y: 80, fontSize: 100, color: '#000000', visible: true }),
  },
  qrCode: {
    type: elementPositions,
    default: () => ({ x: 20, y: 80, fontSize: 100, color: '#000000', visible: true }),
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
