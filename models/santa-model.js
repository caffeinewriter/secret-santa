var mongoose = require('mongoose');

var SantaSchema = new mongoose.Schema({
  santa: {
    type: String,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  retrieved: {
    type: Boolean,
    required: true,
    default: false
  },
  last_retrieved: {
    type: Date,
    required: false,
    default: null
  },
  shipped: {
    type: Boolean,
    required: true,
    default: false
  },
  shipped_at: {
    type: Date,
    required: false,
    default: null
  },
  method: {
    type: String,
    required: true,
    enum: ['none', 'digital', 'physical'],
    default: 'none'
  },
  received: {
    type: Boolean,
    required: true,
    default: false
  },
  received_at: {
    type: Date,
    required: false,
    default: null
  }
});

module.exports = mongoose.model('Santa', SantaSchema);
