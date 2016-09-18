module.exports = function(app) {
  require('./Auth.js')(app);
  require('./Backend.js')(app);
  require('./Modal.js')(app);
};
