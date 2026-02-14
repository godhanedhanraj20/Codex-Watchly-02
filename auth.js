const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const router = express.Router();

let strategyConfigured = false;

function configureStrategy() {
  if (strategyConfigured) {
    return;
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_CALLBACK_URL } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !OAUTH_CALLBACK_URL) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Google OAuth is not fully configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and OAUTH_CALLBACK_URL.');
    }
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: OAUTH_CALLBACK_URL
      },
      (_accessToken, _refreshToken, profile, done) => {
        const user = {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.emails?.[0]?.value || ''
        };
        done(null, user);
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  strategyConfigured = true;
}

configureStrategy();

router.get('/auth/google', (req, res, next) => {
  if (!strategyConfigured) {
    return res.status(500).json({ error: 'Google OAuth not configured on server.' });
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
  if (process.env.NODE_ENV === 'test' && req.query.mock === '1') {
    req.session.user = {
      id: 'test-host-id',
      displayName: 'Mock Host',
      email: 'mock@example.com'
    };
    return req.session.save(() => res.redirect('/public/host.html'));
  }

  if (!strategyConfigured) {
    return res.redirect('/public/');
  }

  return passport.authenticate('google', { failureRedirect: '/public/' })(req, res, () => {
    const profile = req.user || {};
    req.session.user = {
      id: profile.id,
      displayName: profile.displayName,
      email: profile.email || profile.emails?.[0]?.value || ''
    };

    req.session.save(() => {
      res.redirect('/public/host.html');
    });
  });
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/public/');
  });
});

module.exports = router;
