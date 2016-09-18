module.exports = function(app) {
  app.controller('TableCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    function($scope, $rootScope, $state) {
      if (!$rootScope.loggedIn) {
        console.error("not logged in");
        $state.go('root');
      }

      var rows = ['Symbols'];
      config.components.forEach(function(elem) {
        rows.push(elem);
      });
    }
  ]);
};
