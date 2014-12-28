Secret Santa
============
####A horribly messy, yet fully functional Secret Santa application.

[![Gratipay](https://img.shields.io/gratipay/caffeinewriter.svg)](https://gratipay.com/caffeinewriter) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://choosealicense.com/licenses/mit/)

You can see the logged-out front-end of a live instance of it on [Symph.rocks](http://symph.rocks)

###Disclaimer
This code was written over the course of a week after starting from scratch many-a-time. It may contain bugs, errors, vulnerabilities, or performance-sapping issues that generally suck. Many parts of this code were written between the hours of midnight and six AM.

#Prerequisites

* Node.js. Tested on >=0.10.34
* npm. Tested on >=1.4.28
* [Microsoft Visual Studio Express](http://www.visualstudio.com/products/visual-studio-express-vs) will likely be needed to compile all dependencies on Windows.
* A MongoDB database

#Installing

1. Run `git clone https://github.com/caffeinewriter/secret-santa`.
2. Fill out `config.js` with all information. See `config.sample.js` for a template.
3. It is highly recommended that you customize the `index.jade`, `faq.jade` and `donate.jade` files. However, if you leave `donate.jade` unchanged, you'll be supporting ongoing development.
4. Run `npm install`
5. Run it with `npm start`. The port it binds to can be set by these methods, in this order of precedence:
  * `PORT` environment variable. E.g. `PORT=3000 npm start`
  * config.js app.port attribute.
  * If neither of those are present, the application will default to port 3333.

##Features

* Securely hashed passwords using bcrypt.
* Integrated messaging system.
* Guaranteed collision-free pairing algorithm.
* Responsive design and mobile compatibility.
* Session persistence across restarts.
* Robust core feature set.
* Simple.
* Secure.

##`config.js`

The `config.js` file contains all necessary information for the site, and is required to run it. It is structured like this:

```javascript
{
  db: { // The connection info for the MongoDB database
    user: '', // MongoDB Username
    pass: '', // MongoDB Password
    host: '', // The MongoDB Hostname
    port: '', // The MongoDB Port
    name: '', // The MongoDB Database Name
  },
  admin: {
    user: 'username', // The username used in the HTTP Auth for the backend.
    password: 'password' // The password to log into the backend
  },
  cookie: {
    secret: 'cookie secret' // The cookie secret used for securely signing the cookies.
  },
  session: {
    secret: 'session secret' // The secret used for signing sessions.
  },
  mongoStore: {
    salt: 'hash salt', // The salt used to hash session IDs.
  },
  app: {
    port: 80 // The port the application will bind to. Overridden by a PORT environment variable.
  },
  recaptcha: {
    site: '', // ReCAPTCHA Site Key
    secret: '' // ReCAPTCHA Secret Key
  },
  signups: {
    disabled: false // Set to true to disable signups from invited members. (Should remain true while people are joining.)
  }
}
```

##Frontend URLs
These are the URLs exposed to end-users.

###`/signup/:inviteCode`
Allows users to signup for the Secret Santa, provided that they have an invite code, generated on the backend.

###`/login`
Login page. Integrated ReCAPTCHA to prevent brute forcing.

###`/dashboard`
A simple dashboard for users. Easily customizable in `dashboard.jade`.

###`/inbox`
View all messages. Easy as that.

###`/read/:messageId`
Read a specific message with ID `messageId`.

###`/view/recipient`
The profile who the logged in user is gifting to.

###`/faq`
A simple FAQ page. Currently monopolized by my FAQs.

###`/donate`
A donation page, to allow users to donate to keep the server up. You may swap the info out for your own.

###`/edit`
Allows users to edit their own profile and change their password.

##Admin URLs
All admin URLs are secured with HTTP Basic authentication. The username and password combination are specified in the `config.js` file.

###`/admin/import`
This page will allow you to import users in a newline (`"\n"`) delimited list via the `textarea`. The `input` at the bottom is for an alternative delimiter, should the list be delimited with something other than spaces.

###`/admin/list`
List all unclaimed invites, and their associated UIDs.

###`/admin/message`
Send a message to a specified user. Currently, it cannot be replied to, but is simply a targeted notice.

###`/admin/messageall`
Send a message to all currently signed-up users.

###`/admin/setpass/:uid`
Allows you to change the password for the specified user account. For UID "steve", the url would be `/admin/setpass/steve`.

###`/admin/edit/:uid`
Allows you to edit the profile of the specified user account.

###`/admin/shuffle`
This will assign secret santas from all *signed-up* users. This does not include unconfirmed invited users. It's recommended that you disable additional signups after this is run. Be careful to only click the shuffle button once, as in its current state, it can be run more than once, generating multiple pairings and producing unexpected results.

###`/admin/pairings`
View the Secret Santa pairings. Will be empty if `/admin/shuffle` hasn't been run yet.

###`/admin/pairings/new`
Generate a single new pairing. Personally, I used it for fixing a mistake I made after shuffling.

###`/admin/newuser/:uid`
Complete the signup process for a user with the specified UID. Useful if you need to add another user after signups are closed.

###`/admin/view/:uid`
View the specified user's profile.


##Contributing

Visit our [issues page](https://github.com/caffeinewriter/secret-santa/issues) to see tasks to work on. Feel free to submit pull requests to the `dev` branch. If dependencies need updating, do not submit a pull request. Submit an issue, so compatibility can be checked before any changes are made. Please report any vulnerabilities.
