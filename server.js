const path = require('path');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

function isValidBaseUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

const { SESSION_SECRET, NODE_ENV = 'development' } = process.env;

if (!SESSION_SECRET) {
  console.error('SESSION_SECRET is required. Add it to your environment variables.');
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
if (!isValidBaseUrl(BASE_URL)) {
  console.error('BASE_URL is required and must start with http:// or https://.');
  process.exit(1);
}

const OAUTH_CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || `${BASE_URL}/auth/google/callback`;
process.env.OAUTH_CALLBACK_URL = OAUTH_CALLBACK_URL;

if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

const authRouter = require('./auth');
const { router: roomsRouter } = require('./rooms');

app.get('/public/app-config.js', (_req, res) => {
  const config = {
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  };

  res.type('application/javascript');
  res.send(`window.WATCHLY_CONFIG = ${JSON.stringify(config)};`);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.redirect('/public/index.html');
});

app.use(authRouter);
app.use('/api', roomsRouter);

app.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const { id, displayName, email } = req.session.user;
  return res.json({ id, displayName, email });
});

app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }
  return next(err);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Watchly v1 running at http://localhost:${port}`);
  });
}

module.exports = app;
