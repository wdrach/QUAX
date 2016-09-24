module.exports = function(angular) {
  var config = {};
  angular.module('config', []).constant('config', config);
  return config;
};

