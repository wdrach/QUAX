module.exports = function(app) {
  app.controller('ModalCtrl', [
    '$scope',
    '$rootScope',
    '$timeout',
    function($scope, $rootScope, $timeout) {

      $scope.SHOW_MODAL = false;

      $rootScope.$on('m.create', function(event, data) {
        $timeout(function() {
          $scope.SHOW_MODAL = true;
          $scope.content = data;
        });
      });

      $scope.accept = function() {
        $scope.SHOW_MODAL = false;
        return $rootScope.$emit('m.accepted');
      };

      $scope.reject = function() {
        $scope.SHOW_MODAL = false;
        return $rootScope.$emit('m.rejected');
      };
      
    }
  ]);
};
