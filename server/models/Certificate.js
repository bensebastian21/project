const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  studentName: { type: String },
  hostName: { type: String },
  institute: { type: String },
  url: { type: String, required: true }, // /uploads/certificates/...
  filename: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
