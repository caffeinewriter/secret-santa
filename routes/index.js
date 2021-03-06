var express = require('express');
var path = require('path');
var crypto = require('crypto');
var passport = require('passport');
var config = require(path.join(__dirname, '..', 'config.js'));
var LocalStrategy = require('passport-local');
var User = require(path.join(__dirname, '..', 'models/user-model.js'));
var Message = require(path.join(__dirname, '..', 'models/message-model.js'));
var Santa = require(path.join(__dirname, '..', 'models/santa-model.js'));
var Invite = require(path.join(__dirname, '..', 'models/invite-model.js'));
var router = express.Router();
var auth = require('http-auth');
var sanitizer = require('sanitizer');
var recaptcha = require('express-recaptcha');
var _ = require('underscore');
recaptcha.init(config.recaptcha.site, config.recaptcha.secret);

var basic = auth.basic({
  realm: "Secret Santa Administration"
}, function (username, password, callback) {
  callback(username === config.admin.user && password === config.admin.password);
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    User.findOne({uid: username}, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false);
      }
      user.comparePassword(password, function (err, isMatch) {
        if (err) {
          return done(err);
        }
        if (!isMatch) {
          return done(null, false);
        } else {
          user.last_login = new Date();
          user.save(function (err) {
            if (!!err) console.error(err);
          });
          return done(null, user);
        }
      });
    });
  }
));

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(null, user);
  });
});

var isNotAuthenticated = function(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('error', 'You need to be logged in to do that.');
    return res.redirect('/login');
  }
  next();
};

var isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    req.flash('info', 'You are already logged in.');
    return res.redirect('/dashboard');
  }
  next();
};

/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa',
    user: req.user
  });
});

router.get('/register', isAuthenticated, recaptcha.middleware.render, function (req, res) {
  if (config.signups.disabled) {
    res.render('signup-disabled', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Sign Up Closed'
    });
  } else {
    res.render('register', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa Registration',
      captcha: req.recaptcha
    });
  }
});

router.post('/register', isAuthenticated, recaptcha.middleware.verify, function (req, res, next) {
  if (req.recaptcha.success) {
    return next();
  } else {
    req.flash('error', 'CAPTCHA Solved Incorrectly');
    res.redirect('/register');
  }
}, function (req, res) {
    var invite = new Invite();
    var inviteHash = crypto.createHash('sha256');
    inviteHash.update('' + req.body.uid + Math.random() + Date.now());
    invite.inviteCode = inviteHash.digest('hex').substr(-16);
    invite.uid = req.body.uid.replace(/\D/g, '');
    invite.claimed = false;
    invite.save(function (err) {
      if (err) {
        console.error(err);
      }
      req.flash('info', 'You have been successfully registered. You should receive a PM soon.');
      res.redirect('/');
    });
});

router.get('/signup/:inviteToken', isAuthenticated, function (req, res) {
  Invite.findOne({ inviteCode: req.params.inviteToken }, function (err, invite) {
    if (err) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
      res.redirect('/signup/'+req.params.inviteToken);
    }
    if (config.signups.disabled) {
      res.render('signup-disabled', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Sign Up Closed'
      });
    } else if (!invite || invite.claimed || invite.denied) {
      req.flash('error', 'This is an invalid invite code.');
      res.render('uninvited', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Sign Up'
      });
    } else {
      res.render('signup', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Sign Up',
        inviteCode: invite.inviteCode,
        uid: invite.uid
      });
    }
  });
});

router.get('/signup', isAuthenticated, function(req, res) {
  req.flash('error', 'This is an invalid invite code.');
  res.render('uninvited', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Sign Up'
  });
});

router.post('/signup', isAuthenticated, function (req, res) {
  Invite.findOne({ inviteCode: req.body.inviteCode }, function (err, invite) {
    if (config.signups.disabled) {
      res.render('signup-disabled', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Sign Up Closed'
      });
    } else if (!invite || invite.claimed || invite.denied) {
      req.flash('error', 'This is an invalid invite code.');
      res.render('uninvited', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Sign Up'
      });
    } else {
      if (req.body.password.length < 6) {
        req.flash('error', 'Please use a password at least six characters in length.');
        return res.redirect('/signup/'+invite.inviteCode);
      } else if (req.body.interests.length < 1) {
        req.flash('error', 'Please enter some interests to help people figure out what to get you.');
        return res.redirect('/signup/'+invite.inviteCode);
      }
      var user = new User();
      user.uid = invite.uid;
      user.password = sanitizer.escape(req.body.password);
      user.interests = sanitizer.escape(req.body.interests);
      if (!!req.body.address1 && req.body.address1.length > 0 && !!req.body.city && req.body.city.length > 0 && !!req.body.postal && req.body.postal > 0 && !!req.body.country && req.body.country.length > 0) {
        user.address = sanitizer.escape(req.body.address1 + "\n" + (!!req.body.address2 && req.body.address2.length > 0 ? req.body.address2 + "\n" : '') + req.body.city + ', ' + (req.body.state ? req.body.state + ', ' : '') + req.body.postal + ', ' + req.body.country);
      }
      invite.claimed = true;
      invite.save(function (err) {
        if (err) { console.error(err); }
        user.save(function (err) {
          if (err) { console.error(err); }
          req.flash('info', 'Signup was successful. You should be able to log in now.');
          res.redirect('/login');
        });
      });
    }
  });
});

router.get('/login', isAuthenticated, recaptcha.middleware.render, function (req, res) {
  res.render('login', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Login',
    captcha: req.recaptcha
  });
});

router.post('/login', recaptcha.middleware.verify, function (req, res, next) {
  if (req.recaptcha.success) {
    return next();
  } else {
    req.flash('error', 'CAPTCHA Solved Incorrectly');
    res.redirect('/login');
  }
}, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: 'Invalid username or password',
  successFlash: 'Successfully logged in.'
}));

router.get('/logout', function (req, res) {
  req.logout();
  req.flash('error', 'You have been successfully logged out.');
  res.redirect('/login');
});

router.get('/admin/import', auth.connect(basic), function (req, res) {
  res.render('import', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | Import'
  });
});

router.get('/admin', auth.connect(basic), function (req, res) {
  res.render('admin-dashboard', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration Dashboard'
  });
});

router.get('/admin/dashboard', auth.connect(basic), function (req, res) {
  res.render('admin-dashboard', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration Dashboard'
  });
});

router.post('/admin/import', auth.connect(basic), function (req, res) {
  var uids = req.body.uids;
  uids = uids.replace("\r", '');
  var separator = !req.body.separator ? "\n" : req.body.separator;
  uids = uids.split(separator);
  var enumUids = uids.length;
  uids.forEach(function (uid) {
    var invite = new Invite();
    var inviteHash = crypto.createHash('sha256');
    inviteHash.update('' + uid + Math.random() + Date.now());
    invite.inviteCode = inviteHash.digest('hex').substr(-16);
    invite.uid = uid.replace(/\D/g, '');
    invite.claimed = false;
    invite.save(function (err) {
      if (err) { console.error(err); }
    });
  });
  res.render('imported', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | Imported ' + enumUids + ' Users',
    numberRecs: enumUids
  });
});

router.get('/admin/list', auth.connect(basic), function (req, res) {
  Invite.find({claimed: false}).sort({_id: 1}).exec(function (err, invites) {
    res.render('invite-list', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Administration | Invite List',
      invites: invites
    });
  });
});

router.post('/admin/deny/:invite', auth.connect(basic), function (req, res) {
  Invite.findOne({
    inviteCode: req.params.invite
  }, function (err, invite) {
    if (!!err || !invite) {
      req.flash('error', 'Something went wrong.');
      return res.redirect('/admin/list');
    }
    invite.denied = true;
    invite.save(function (err) {
      if (!!err) {
        req.flash('error', 'Something went wrong while saving the invite.');
        return res.redirect('/admin/list');
      }
      req.flash('info', 'Invite successfully denied for ' + invite.uid);
      res.redirect('/admin/list');
    });
  });
});

router.post('/admin/sent/:invite', auth.connect(basic), function (req, res) {
  Invite.findOne({
    inviteCode: req.params.invite
  }, function (err, invite) {
    if (!!err || !invite) {
      req.flash('error', 'Something went wrong.');
      return res.redirect('/admin/list');
    }
    invite.sent = true;
    invite.save(function (err) {
      if (!!err) {
        req.flash('error', 'Oops! Something went wrong while saving the invitation.');
        return res.redirect('/admin/list');
      }
      req.flash('info', 'Successfully marked invite as sent');
      res.redirect('/admin/list');
    })
  })
});

router.get('/admin/list/plain', auth.connect(basic), function (req, res) {
  Invite.find({claimed: false}).sort({_id: 1}).exec(function (err, invites) {
    res.render('admin-copy-invites', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Administration | Plain Text Invite List',
      invites: invites
    });
  });
});

router.get('/admin/message', auth.connect(basic), function(req, res) {
  res.render('custom-message', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | Send Custom Message'
  });
});

router.post('/admin/message', auth.connect(basic), function(req, res) {
  var message = new Message();
  message.from = 999999999;
  message.recipient = req.body.uid;
  message.body = req.body.message;
  message.sent = Date.now();
  message.unread = true;
  var messageHash = crypto.createHash('sha256');
  messageHash.update('' + req.body.uid + Math.random() + Date.now());
  message.messageId = messageHash.digest('hex').substr(-16);
  message.save(function(err) {
    if (err) {
      console.error(err);
    }
      req.flash('info', 'Message was successfully sent to ' + req.body.uid + '.');
      res.redirect('/admin/message');
  });
});

router.get('/admin/setpass/:uid', auth.connect(basic), function(req, res) {
  res.render('reset-password', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | Setting Password',
    uid: req.params.uid
  });
});

router.post('/admin/setpass/:uid', auth.connect(basic), function(req, res) {
  if (req.body.password.length < 6) {
    req.flash('error', 'Too short a password.');
    res.redirect('/admin/setpass/'+req.params.uid);
  } else {
    User.findOne({
      uid: req.params.uid
    },
    function(err, user) {
      if (err || !user) {
        console.error(err);
        req.flash('error', 'Oops, something went wrong.');
        return res.redirect('/admin/setpass/'+req.params.uid);
      }
      user.password = req.body.password;
      user.save(function(err) {
        if (err) {
          console.error(err);
          req.flash('error', 'Oops, something went wrong.');
          return res.redirect('/admin/setpass/'+req.params.uid);
        }
        req.flash('info', 'The password was changed successfully.');
        res.redirect('/admin/setpass/'+req.params.uid);
      });
    });
  }
});

router.get('/admin/edit/:uid', auth.connect(basic), function(req, res) {
  User.findOne({
    uid: req.params.uid
  }, function (err, user) {
    res.render('edit-admin', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Edit User Profile',
      user: user
    });
  });
});

router.post('/admin/edit/:uid', auth.connect(basic), function(req, res) {
  User.findOne({
    uid: req.params.uid
  }, function(err, user) {
    if (err) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/admin/list');
    }
    if(!user) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/admin/list');
    }
    if(req.body.password.length < 6) {
      req.flash('error', 'Please use a password at least six characters in length. Password unchanged.');
    }
    if (req.body.password && req.body.password.length >= 6) {
      user.password = req.body.password;
    }
    if (req.body.interests) {
      user.interests = req.body.interests;
    }
    if (req.body.address) {
      user.address = req.body.address;
    }
    user.save(function(err) {
      if (err) {
        console.error(err);
        req.flash('error', 'Oops! Something went wrong.');
        res.redirect('/admin/edit/'+req.body.uid);
      }
      req.flash('info', 'Successfully saved the profile!');
      res.redirect('/admin/edit/'+req.body.uid);
    });
  });
});

router.get('/admin/shuffle', auth.connect(basic),function(req, res) {
  res.render('shuffle', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | Shuffle'
  });
});

router.post('/admin/shuffle', auth.connect(basic), function(req, res) {
  User.find({}, function(err, users) {
    var uidArr = [];
    users.forEach(function (user) {
      uidArr.push(user.uid);
    });
    uidArr = _.shuffle(uidArr);
    var sUidArr = _.union(_.rest(uidArr), [_.first(uidArr)]);
    for (var i = 0; i < uidArr.length; i++) {
      var santa = new Santa();
      santa.santa = uidArr[i];
      santa.recipient = sUidArr[i];
      santa.save(function(err) {
        if (err) {
          req.flash('error', 'Oops! Something went wrong.');
          return res.redirect('/admin/shuffle');
        }
      });
    }
    req.flash('info', 'Users have been shuffled!');
    return res.redirect('/admin/shuffle');
  });
});

router.get('/admin/messageall', auth.connect(basic), function(req, res) {
  res.render('message-all', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | Message All'
  });
});

router.post('/admin/messageall', auth.connect(basic), function(req, res) {
  var message = new Message();
  message.from = '999999999';
  message.recipient = '-1';
  message.body = req.body.message;
  message.sent = Date.now();
  message.unread = true;
  var messageHash = crypto.createHash('sha256');
  messageHash.update('' + user.uid + Math.random() + Date.now());
  message.messageId = messageHash.digest('hex').substr(-16);
  message.save(function(err) {
    if (err) {
      req.flash('error', 'Something went wrong!');
      return res.redirect('/admin/messageall');
    }
  });
  req.flash('info', 'Messages sent successfully.');
  res.redirect('/admin/messageall');
});

router.get('/admin/pairings', auth.connect(basic), function(req, res) {
  Santa.find({}, function(err, santas) {
    res.render('view-pairings', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Administration | View Pairings',
      santas: santas
    });
  });
});

router.get('/admin/pairings/new', auth.connect(basic), function(req, res) {
  res.render('new-pairing', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Administration | New Pairing'
  });
});

router.post('/admin/pairings/new', auth.connect(basic), function(req, res) {
  if(!req.body.santa || !req.body.recipient) {
    req.flash('error', 'There must be both a santa and a recipient.');
    return res.redirect('/admin/pairings/new');
  }
  var santa = new Santa();
  santa.santa = req.body.santa;
  santa.recipient = req.body.recipient;
  santa.save(function(err) {
    if (err) {
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/admin/pairings/new');
    }
    req.flash('info', 'New pairing created successfully.');
    res.redirect('/admin/pairings');
  });
});

router.get('/admin/newuser/:uid', auth.connect(basic), function(req, res) {
  res.render('admin-newuser', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Sign Up',
    uid: req.params.uid
  });
});

router.post('/admin/newuser/:uid', auth.connect(basic), function(req, res) {
  var user = new User();
  user.uid = sanitizer.escape(req.params.uid);
  user.password = sanitizer.escape(req.body.password);
  user.interests = sanitizer.escape(req.body.interests);
  if (req.body.address1) {
    user.address = sanitizer.escape(req.body.address1 + "\n" + (req.body.address2 ? req.body.address2 + "\n" : '') + req.body.city + ', ' + (req.body.state ? req.body.state + ', ' : '') + req.body.postal + ', ' + req.body.country);
  }
  user.save(function(err) {
    if (err) {
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/admin/newuser/'+req.params.uid);
    }
    req.flash('info', 'User was created successfully.');
    res.redirect('/admin/edit/'+req.params.uid);
  });
});

router.get('/admin/view/:uid', auth.connect(basic), function(req, res) {
  User.findOne({
    uid: req.params.uid
  }, function(err, user) {
    if (err || !user) {
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/admin/list');
    }
    res.render('profile', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Administration | View Profile',
      profile: user
    });
  });
});

router.get('/dashboard', isNotAuthenticated, function (req, res) {
  // console.dir(req.user);
  Message.find({
    recipient: req.user.uid,
    unread: true
  }, function(err, messages) {
    res.render('dashboard', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Dashboard',
      user: req.user,
      unreadCount: messages.length,
      matched: config.signups.disabled
    });
  });
});

router.get('/received', isNotAuthenticated, function (req, res) {
  Santa.findOne({
    recipient: req.user.uid
  }, function(err, santa) {
    if (!santa || err) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/dashboard');
    }
    if (santa.received) {
      req.flash('info', 'You have already marked your gift as received.');
      return res.redirect('/dashboard');
    }
    res.render('confirm-receipt', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Confirm Gift Receipt',
      user: req.user
    });
  });
});

router.post('/received', isNotAuthenticated, function (req, res) {
  Santa.findOne({
    recipient: req.user.uid
  }, function(err, santa) {
    if (!santa || err) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/receive');
    }
    santa.received = true;
    santa.save(function(err) {
      if (err) {
        console.error(err);
        req.flash('error', 'Oops! Something went wrong.');
        return res.redirect('/receive');
      }
      req.info('info', 'Gift confirmed received.');
      res.redirect('/dashboard');
    });
  });
});

router.get('/inbox', isNotAuthenticated, function (req, res) {
  Message.find({$or: [{recipient: req.user.uid}, {recipient: '-1'}]}).sort({sent: -1}).exec(function (err, messages) {
    if (err) {
      console.error(err);
    }
    Santa.findOne({
      recipient: req.user.uid
    }, function(err, santa) {
      if (!santa) {
        santa = {};
        santa.santa = 1;
      }
      res.render('inbox', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Inbox',
        santa: santa.santa,
        user: req.user,
        messages: messages
      });
    });
  });
});

router.get('/send/santa', isNotAuthenticated, function (req, res) {
  res.render('compose-santa', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | New Message',
    user: req.user
  });
});

router.get('/send/recipient', isNotAuthenticated, function (req, res) {
  res.render('compose-recipient', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | New Message',
    user: req.user
  });
});

router.post('/send/santa', isNotAuthenticated, function (req, res) {
  Santa.findOne({
    recipient: req.user.uid
  }, function (err, santa) {
    if (err) {
      console.error(err);
    }
    if (!santa) {
      req.flash('error', 'Oops! Something went wrong.');
      res.redirect('/inbox');
    } else {
      var message = new Message();
      var messageHash = crypto.createHash('sha256');
      messageHash.update('' + santa.santa + Math.random() + Date.now());
      message.messageId = messageHash.digest('hex').substr(-16);
      message.from = santa.recipient;
      message.recipient = santa.santa;
      message.body = sanitizer.sanitize(req.body.message);
      message.sent = Date.now();
      message.unread = true;
      message.save(function (err) {
        if (err) {
          console.error(err);
          req.flash('error', 'Oops! Something went wrong.');
          return res.redirect('/inbox');
        }
        req.flash('info', 'Message sent successfully.');
        res.redirect('/inbox');
      });
    }
  });
});

router.post('/send/recipient', isNotAuthenticated, function (req, res) {
  Santa.findOne({
    santa: req.user.uid
  }, function (err, santa) {
    if (err) {
      console.error(err);
    }
    if (!santa) {
      req.flash('error', 'Oops! Something went wrong.');
      res.redirect('/inbox');
    } else {
      var message = new Message();
      var messageHash = crypto.createHash('sha256');
      messageHash.update('' + santa.recipient + Math.random() + Date.now());
      message.messageId = messageHash.digest('hex').substr(-16);
      message.from = santa.santa;
      message.recipient = santa.recipient;
      message.body = sanitizer.sanitize(req.body.message);
      message.sent = Date.now();
      message.unread = true;
      message.save(function (err) {
        if (err) {
          console.error(err);
          req.flash('error', 'Oops! Something went wrong.');
          return res.redirect('/inbox');
        }
        req.flash('info', 'Message sent successfully.');
        res.redirect('/inbox');
      });
    }
  });
});

router.get('/read/:message', isNotAuthenticated, function (req, res) {
  Santa.findOne({
    recipient: req.user.uid
  }, function(err, santa) {
    Message.findOne({
      messageId: req.params.message,
      recipient: req.user.uid
    }, function (err, message) {
      if (message.unread) {
        message.unread = false;
        message.save(function (err) {
          if (err) {
            console.error(err);
          }
        });
      }
      res.render('message', {
        info: req.flash('info'),
        error: req.flash('error'),
        title: 'Secret Santa | Read Message',
        message: message,
        user: req.user,
        santa: santa.santa
      });
    });
  });
});

router.get('/edit', isNotAuthenticated, function(req, res) {
  User.findOne({
    uid: req.user.uid
  }, function(err, user) {
    if (err) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
    }
    res.render('edit-user', {
      info: req.flash('info'),
      error: req.flash('error'),
      title: 'Secret Santa | Edit Profile',
      profile: user,
      user: req.user
    });
  });
});

router.post('/edit', isNotAuthenticated, function(req, res) {
  User.findOne({
    uid: req.user.uid
  }, function(err, user) {
    if (err) {
      console.error(err);
      req.flash('error', 'Oops! Something went wrong.');
    }
    if (req.body.password) {
      user.password = req.body.password;
    }
    if (req.body.interests) {
      user.interests = req.body.interests;
    }
    if (req.body.address) {
      user.address = req.body.address;
    }
    user.save(function(err) {
      if (err) {
        console.error(err);
        req.flash('error', 'Oops! Something went wrong.');
        res.redirect('/edit');
      }
      req.flash('info', 'Successfully saved your profile!');
      res.redirect('/dashboard');
    });
  });
});

router.get('/view/recipient', isNotAuthenticated, function(req, res) {
  if (!config.signups.disabled) {
    req.flash('info', 'Matching hasn\'t occurred yet, so there\'s no match to view. Please check back in a few days.');
    return res.redirect('/dashboard');
  }
  Santa.findOne({
    santa: req.user.uid
  }, function(err, santa) {
    if (err || !santa) {
      req.flash('error', 'Oops! Something went wrong.');
      return res.redirect('/dashboard');
    }
    User.findOne({
      uid: santa.recipient
    }, function(err, user) {
      if (err || !user) {
        req.flash('error', 'Oops! Something went wrong.');
        return res.redirect('/dashboard');
      }
      santa.retrieved = true;
      santa.last_retrieved = new Date();
      santa.save(function () {
        if (err) {
          req.flash('error', 'Oops! Something went wrong.');
          return res.redirect('/dashboard');
        }
      });
      res.render('profile', {
        info: req.flash('info'),
        error: req.flash('error'),
        user: req.user,
        title: 'Secret Santa | Recipient Profile',
        profile: user
      });
    });
  });
});

router.get('/faq', function(req, res) {
  res.render('faq', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | FAQ',
    user: req.user
  });
});

router.get('/donate', function(req, res) {
  res.render('donate', {
    info: req.flash('info'),
    error: req.flash('error'),
    title: 'Secret Santa | Donate',
    user: req.user
  });
});

module.exports = router;
