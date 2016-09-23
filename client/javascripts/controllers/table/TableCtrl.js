module.exports = function(app) {
  app.controller('TableCtrl', [
    '$scope',
    '$rootScope',
    '$state',
    'Backend',
    function($scope, $rootScope, $state, Backend) {
      if (!$rootScope.loggedIn) {
        console.error("not logged in");
        $state.go('root');
      }

      //base for no weights
      //test (only for date !== now) for equal equity in each metric
      //weight for weighing metrics
      $scope.mode = 'base';
      //now for this last Monday
      //YYYYMMDD for any other date
      $scope.date = 'now';

      var labels = ['Symbol', 'Quality', 'Value', 'Implied Volatility', 'Momentum', 'Current Price'];

      var pastLabels = ['Symbol', 'Quality', 'Value', 'Implied Volatility', 'Momentum', 'Current Price', 'Future Price', 'Percent Difference'];

      $scope.displayTable = [labels];

      function listTable() {
        if ($scope.date === 'now') {
          var table = [labels];
          for (var key in $scope.table) {
            var entry = $scope.table[key];
            table.push([key, entry.Q, entry.V, entry.IV, entry.M, entry.price]);
          }
          $displayTable = table;
        }
        else {
          var table = [pastLabels];
        }
      }

      Backend.getTable($scope.date).then(function(data) {
        $scope.table = data.data;
        listTable();
      });
    }
  ]);
};
