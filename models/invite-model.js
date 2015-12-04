var mongoose = require('mongoose');

InviteSchema = new mongoose.Schema({
  inviteCode: {
    type: String,
    required: true
  },
  uid: {
    type: String,
    required: true
  },
  sent: {
    type: Boolean,
    default: false
  },
  denied: {
    type: Boolean,
    default: false
  },
  claimed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Invite', InviteSchema);
