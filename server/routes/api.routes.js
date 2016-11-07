var router = require('express').Router();
var UserController = require('../controllers/user.controller');
var TableController = require('../controllers/table.controller');
var DeltaController = require('../controllers/delta.controller');

module.exports = function(passport) {
  router.use(passport.authenticate('bearer'));

  router.route('/loggedIn').get(UserController.loggedIn);
  router.route('/table/date/:date').get(TableController.getTable);
  router.route('/table/getValidDates').get(TableController.getValidDates);
  router.route('/current').get(DeltaController.getCurrentQuantity);
  return router;
}
