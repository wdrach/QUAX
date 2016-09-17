var exports = module.exports = {};

exports.googleCb = function (passport, provider) {
  //have to return an express middleware function
  return function (req, res, next) {
    failRedirect = '/login';

    //authenticate (and get the user)
    passport.authenticate('google', function (err, user, info) {
      if (err) return next(err);
      if (!user || !user.token) return res.redirect('/fail');

      var token = user.token;
      res.redirect('/loginCallback/' + token);
    })(req, res, next);
  };
}
