module.exports = function(app) {
  app.controller('TableCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    function($scope, $rootScope, $state) {
      if ($rootScope.loggedIn) {
        $scope.text = "hello world";
      }
      else {
        console.error("not logged in");
        $state.go('root');
      }
    }
  ]);
};
