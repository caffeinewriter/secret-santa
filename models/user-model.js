var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var SALT_WORK = 11;

var UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  interests: {
    type: String,
    required: false
  },
  address: {
    type: String,
    required: false
  },
  last_login: {
    type: Date,
    required: false
  }
});

UserSchema.pre('save', function(next) {
  var user = this;

  if (!user.isModified('password')) {
    return next();
  }

  bcrypt.genSalt(SALT_WORK, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      return next();
    });
  });
});

UserSchema.methods.comparePassword = function(candidate, cb) {
  bcrypt.compare(candidate, this.password, function(err, match) {
    if (err) return cb(err);
    cb(null, match);
  });
}

module.exports = mongoose.model('User', UserSchema);
