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
  received: {
    type: Boolean,
    required: false,
    default: false
  }
});

module.exports = mongoose.model('Santa', SantaSchema);
