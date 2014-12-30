var config = {
  db: {
    user: 'username',
    pass: 'password',
    host: 'db.host.tld',
    port: '12345',
    name: 'dbname'
  },
  admin: {
    user: 'backend',
    password: 'password'
  },
  cookie: {
    secret: 'keyboard cat'
  },
  session: {
    secret: 'moo moo black sheep'
  },
  mongoStore: {
    salt: 'you can dance if you want to'
  },
  app: {
    port: 80
  },
  recaptcha: {
    site: 'recaptcha_site_key',
    secret: 'recaptcha_secret_key'
  },
  signups: {
    disabled: false
  }
}

module.exports = config;
