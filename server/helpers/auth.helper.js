var passport = require('passport')
  , crypto = require('crypto')
  , Hashids = require('hashids')
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
  , TokenStrategy = require('passport-http-bearer').Strategy;

var accepted_users = {"widr1225@colorado.edu": true,
                      "will.drach@gmail.com": true};

var users = {};

//for genning tokens
var hashids = new Hashids("this1sAsuPerSecure81Salt!!", 0,
  "abcdefghijklmnopqrstuvwxyz0123456789");

function genToken(cb) {
  crypto.randomBytes(70, function (ex, buf) {
    cb(hashids.encodeHex(buf.toString('hex')));
  });
};

//keep the intermediate CB DRY
function tokenCB() {
  return function(accessToken, refreshToken, profile, done) {
    var email = profile.emails[0].value;

    if (!accepted_users[email]) return done(null, false);

    if (users[profile.id] && users[profile.id].token) {
      return done(null, users[profile.id]);
    }

    genToken(function(token) {
      profile.token = token;
      users[profile.id] = {
        email: email,
        id: profile.id,
        uid: profile.id,
        token: token
      };
      done(null, profile);
    });
  };
}

module.exports = function() {
  //don't serialize for the time being
  passport.serializeUser(function(user, done) {
      done(null, user);
  });

  passport.deserializeUser(function(user, done) {
      done(null, user);
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "/auth/google/callback"
  },
  tokenCB('google')));

  //simply looks up the token in the DB and returns the user
  passport.use(new TokenStrategy(function (token, cb) {
    if (!token) return cb(null, false);
    for (var key in users) {
      if (users[key].token === token) return cb(null, users[key]);
    }
    return cb(null, false);
  }));

	return passport;
};
