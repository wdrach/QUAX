var router = require('express').Router();
var TestController = require('../controllers/test.controller');

router.route('/test').get(TestController.test);

module.exports = router;
