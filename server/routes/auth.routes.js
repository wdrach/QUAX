var router = require('express').Router();
var AuthController = require('../controllers/auth.controller');

module.exports = function (passport) {
  router.route('/google').get(passport.authenticate('google', {scope: 'email'}));
  router.route('/google/callback').get(AuthController.googleCb(passport));

  return router;
}
