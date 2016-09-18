module.exports = function(app) {
  require('./AppController.js')(app);
  require('./app/FailCtrl.js')(app);
  require('./app/RootCtrl.js')(app);
  require('./app/LoginCallbackCtrl.js')(app);
  require('./app/ModalCtrl.js')(app);
  require('./table/TableCtrl.js')(app);
};
