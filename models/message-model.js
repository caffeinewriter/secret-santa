var mongoose = require('mongoose');

var MessageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  sent: {
    type: Date,
    required: true,
    default: Date.now()
  },
  unread: {
    type: Boolean,
    default: true
  },
  messageId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Message', MessageSchema);
