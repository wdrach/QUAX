module.exports = function(app) {
  app.controller('TableCtrl', [
    '$filter',
    '$scope',
    '$rootScope',
    '$state',
    'Backend',
    function($filter, $scope, $rootScope, $state, Backend) {
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

      //round to N decimal points
      $scope.accuracy = 3;

      var labels = ['Symbol', 'Quality', 'Value', 'Implied Volatility', 'Momentum', 'Current Price'];

      var pastLabels = ['Symbol', 'Quality', 'Value', 'Implied Volatility', 'Momentum', 'Current Price', 'Future Price', 'Percent Difference'];

      $scope.displayTable = [];
      $scope.labels = labels;

      function listTable(givenTable) {
        if ($scope.date === 'now') {
          $scope.labels = labels;
          var table = [];
          for (var key in givenTable) {
            var entry = givenTable[key];
            if (entry.symbol && entry.symbol[0] !== '_') {
              var sym = entry.symbol
                , Q = $filter('number')(entry.Q, $scope.accuracy)
                , V = $filter('number')(entry.V, $scope.accuracy)
                , IV = $filter('number')(entry.IV, $scope.accuracy)
                , M = $filter('number')(entry.M, $scope.accuracy)
                , price = $filter('number')(entry.price, $scope.accuracy);
              table.push([sym, Q, V, IV, M, price]);
            }
          }
          $scope.displayTable = table;
        }
      }

      Backend.getTable($scope.date).then(function(data) {
        listTable(data.data);
      });
    }
  ]);
};
