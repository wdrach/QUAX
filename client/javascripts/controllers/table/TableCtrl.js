module.exports = function(app) {
  app.controller('TableCtrl', [
    '$filter',
    '$rootScope',
    '$sce',
    '$scope',
    '$state',
    '$stateParams',
    '$timeout',
    'Backend',
    function($filter, $rootScope, $sce, $scope, $state, $stateParams, $timeout, Backend) {
      if (!$rootScope.loggedIn) {
        console.error("not logged in");
        $state.go('root');
      }

      Backend.getValidDates().then(function(data) {
        $scope.dates = data.data.dates.sort();

        //now for this last Monday
        //YYYYMMDD for any other date
        $scope.date = $scope.dates[0];
        if ($stateParams.date) {
          $scope.date = $stateParams.date;
        }
        $scope.selectDate = $scope.date;

        Backend.getTable($scope.date).then(function(data) {
          $scope.table = data.data;
          listTable(data.data);
        });
      });

      //base for no weights
      //test (only for date !== now) for equal equity in each metric
      //weight for weighing metrics
      $scope.mode = 'base';


      //round to N decimal points
      $scope.accuracy = 3;

      //Sort by this value
      $scope.sortBy = 'Symbol';
      //Ascending/Descending
      $scope.ascending = true;

      //how many values to have in the top/bottom tables
      $scope.N = 15;

      var labels = ['Symbol', 'Price', 'Beta', '1 Mo. Sharpe'];

      $scope.displayTable = [];
      $scope.labels = labels;

      function listTable(givenTable) {
        var table_keys = [];
        for (var key in givenTable) {
          if (key[0] !== '_') {
            table_keys.push(key);
          }
        };

        var tables = [];
        table_keys.forEach(function(elem) {
          var table = {
            labels: [],
            title: givenTable['_' + elem + '_title'],
            cells: []
          };
          for (var i in labels) {
            table.labels.push(labels[i]);
          }
          table.labels.push(givenTable['_' + elem + '_header']);

          givenTable[elem].forEach(function(el) {
            var sym = el.symbol
              , price = '$' + $filter('number')(el.price, 2)
              , beta = $filter('number')(el.beta, $scope.accuracy)
              , sharpe = $filter('number')(el.sharpe, $scope.accuracy)
              , val = $filter('number')(el[elem], $scope.accuracy);

            table.cells.push([sym, price, beta, sharpe, val]);
          });

          tables.push(table);
        });

        //display
        $timeout(function() {
          $scope.tables = tables;
        });
      }

      $scope.updateDate = function(date) {
        $scope.date = date;

        Backend.getTable($scope.date).then(function(data) {
          $scope.table = data.data;
          listTable(data.data);
        });
      }
    }
  ]);
};
