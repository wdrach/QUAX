module.exports = function(app) {
  app.controller('RootCtrl', [
    '$scope',
    '$state',
    function($scope, $state) {

      $scope.login = function() {
        return $state.go("login");
      };

    }
  ]);
};
