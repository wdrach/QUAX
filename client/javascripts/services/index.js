module.exports = function(app) {
  require('./Modal.js')(app);
  require('./Auth.js')(app);
};
