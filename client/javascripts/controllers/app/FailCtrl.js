module.exports = function(app) {
  app.controller('FailCtrl', [
    '$rootScope',
    '$scope',
    '$state',
    '$window',
    'Auth',
    function($rootScope, $scope, $state, $window, Auth) {
      Auth.getToken().then(function() {
        $rootScope.loggedIn = true;
        $state.go('table');
      });

      if ($rootScope.loggedIn) {
        $state.go('table');
      };

      $scope.login = function() {
        return $window.location.href = "/auth/google";
      };

      $scope.goHome = function() {
        $state.go('root');
      };

    }
  ]);
};
