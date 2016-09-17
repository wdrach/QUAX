module.exports = function(app) {
  app.controller('LoginCallbackCtrl', [
    '$rootScope',
    '$scope',
    '$stateParams',
    '$state',
    'Auth',
    function($rootScope, $scope, $stateParams, $state, Auth) {
      var token = $stateParams.token;

      Auth.setToken($stateParams.token);
      $rootScope.loggedIn = true;

      $state.go('table');
    }
  ]);
};
