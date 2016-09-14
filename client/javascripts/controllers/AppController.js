module.exports = function(app) {
  app.controller('AppController', [
    '$scope',
    '$rootScope',
    '$state',
    '$window',
    '$timeout',
    function($scope, $rootScope, $state, $window, $timeout) {
      $scope.$state = $state;
      $rootScope.e = {}; // container for global events
      var mouseEvent;

      $scope.$back = function() {
        $window.history.back();
      };

      var lastTimeout,
          waitFor = 3000;

      //sleep if the user isn't moving their mouse
      function setUiSleep() {
        lastTimeout = setTimeout(function() {
          $timeout(function() {
            $rootScope.UI_SLEEP = true;
          });
        }, waitFor);
      };

      $scope.mouseMove = function() {
        $timeout(function() {
          $rootScope.UI_SLEEP = false;
          clearTimeout(lastTimeout);
          setUiSleep();
        });
      };
    }
  ]);
};
