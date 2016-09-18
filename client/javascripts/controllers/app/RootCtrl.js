module.exports = function(app) {
  app.controller('RootCtrl', [
    '$rootScope',
    '$scope',
    '$state',
    '$window',
    'Backend',
    function($rootScope, $scope, $state, $window, Backend) {
      Backend.loggedIn().then(function() {
        $rootScope.loggedIn = true;
      });

      $scope.login = function() {
        if ($rootScope.loggedIn) return $state.go('table');
        return $window.location.href = "/auth/google";
      };

    }
  ]);
};
