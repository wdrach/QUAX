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
        var portfolio_keys = [];
        for (var key in givenTable) {
          if (key[0] !== '_') {
            portfolio_keys.push(key);
          }
        };

        var portfolios = [];
        portfolio_keys.forEach(function(elem) {
          var portfolio = {
            title: givenTable[elem]['_title'],
            beta: $filter('number')(givenTable[elem].beta, $scope.accuracy),
            short: {
              labels: [],
              cells: []
            },
            long: {
              labels: [],
              cells: []
            }
          };

          for (var i in labels) {
            portfolio.long.labels.push(labels[i]);
            portfolio.short.labels.push(labels[i]);
          }
          portfolio.long.labels.push(givenTable[elem]['_long_header']);
          portfolio.short.labels.push(givenTable[elem]['_short_header']);

          //construct long portfolio
          givenTable[elem].long.forEach(function(el) {
            var sym = el.symbol
              , price = '$' + $filter('number')(el.price, 2)
              , beta = $filter('number')(el.beta, $scope.accuracy)
              , sharpe = $filter('number')(el.sharpe, $scope.accuracy)
              , val = $filter('number')(el[givenTable[elem]['_long_val']], $scope.accuracy);


            portfolio.long.cells.push([sym, price, beta, sharpe, val]);
          });

          //same for short
          givenTable[elem].short.forEach(function(el) {
            var sym = el.symbol
              , price = '$' + $filter('number')(el.price, 2)
              , beta = $filter('number')(el.beta, $scope.accuracy)
              , sharpe = $filter('number')(el.sharpe, $scope.accuracy)
              , val = $filter('number')(el[givenTable[elem]['_short_val']], $scope.accuracy);

            portfolio.short.cells.push([sym, price, beta, sharpe, val]);
          });

          portfolios.push(portfolio);
        });

        //display
        $timeout(function() {
          $scope.portfolios = portfolios;
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
