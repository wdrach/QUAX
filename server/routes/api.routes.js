var router = require('express').Router();
var UserController = require('../controllers/user.controller');

module.exports = function(passport) {
  router.use(passport.authenticate('bearer'));

  router.route('/loggedIn').get(UserController.loggedIn);
  return router;
}
