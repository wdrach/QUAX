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

      //back out if not logged in
      if (!$rootScope.loggedIn) {
        console.error("not logged in");
        $state.go('root');
      }


      //get the valid dates for the full table
      Backend.getValidDates().then(function(data) {
        //sort alphabetically, which in this case also sorts numerically
        $scope.dates = data.data.dates.sort();

        //pick the most recent date
        $scope.date = $scope.dates[$scope.dates.length - 1];
        //use the path date if you want
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

      //number of dollars in our portfolio
      $scope.dollars = "10000000";
      $scope.portfolio_dollars = {};
      $scope.portfolio_percent = {};
      $scope.previous_pd = {};
      $scope.previous_dollars = "10000000";
      $scope.cash = "5";
      $scope.percent = 0;
      $scope.dollarError = false;
      $scope.percentError = false;

      //round to N decimal points
      $scope.accuracy = 3;

      //Sort by this value
      $scope.sortBy = 'Symbol';
      //Ascending/Descending
      $scope.ascending = true;

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
        var d = parseInt($scope.dollars);
        var cash = parseFloat($scope.cash);
        if (isNaN(d) || isNaN(cash) || cash > 100) {
          $timeout(function() {
            $scope.dollarError = true;
          });
          return;
        }
        else {
          $timeout(function() {
            $scope.dollarError = false;
          });
        }

        var total_dollars = 0;
        var rebalance = $scope.dollars !== $scope.previous_dollars;
        var total_percent = cash;

        portfolio_keys.forEach(function(elem) {
          d = parseFloat($scope.portfolio_dollars[elem]);
          p = parseFloat($scope.portfolio_percent[elem]);
          if (!d) {
            $scope.portfolio_dollars[elem] = Math.floor((1-cash/100)*$scope.dollars/portfolio_keys.length);
            $scope.previous_pd[elem] = Math.floor($scope.dollars/portfolio_keys.length);
            $scope.portfolio_percent[elem] = (100 - cash)/portfolio_keys.length;
          }
          else if (rebalance) {
            $scope.portfolio_dollars[elem] = Math.floor($scope.dollars*$scope.previous_pd[elem]/$scope.previous_dollars);
          }
          else if (isNaN(d) && !$scope.percent) {
            $timeout(function() {
              $scope.dollarError = true;
            });
            return;
          }
          else if (isNaN(p) && $scope.percent) {
            $timeout(function() {
              $scope.percentError = true;
            });
            return;
          }
          else {
            $timeout(function() {
              $scope.dollarError = false;
            });
          }

          var dollars = 0;
          if ($scope.percent) {
            total_percent += p;
            dollars = Math.floor($scope.dollars*p/100);
          }
          else {
            dollars = Math.floor($scope.portfolio_dollars[elem]);
          }
          total_dollars += dollars;

          var portfolio = {
            title: givenTable[elem]['_title'],
            key: elem,
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
          portfolio.long.labels.push('Weight', 'Amount');
          portfolio.short.labels.push('Weight', 'Amount');


          //construct long portfolio
          givenTable[elem].long.forEach(function(el) {
            var sym = el.symbol
              , price = '$' + $filter('number')(el.price, 2)
              , beta = $filter('number')(el.beta, $scope.accuracy)
              , sharpe = $filter('number')(el.sharpe, $scope.accuracy)
              , val = $filter('number')(el[givenTable[elem]['_long_val']], $scope.accuracy)
              , weight = $filter('number')(el.weight*100, 1) + '%'
              , amount = Math.floor(el.weight*dollars/el.price);


            portfolio.long.cells.push([sym, price, beta, sharpe, val, weight, amount]);
          });

          //same for short
          givenTable[elem].short.forEach(function(el) {
            var sym = el.symbol
              , price = '$' + $filter('number')(el.price, 2)
              , beta = $filter('number')(el.beta, $scope.accuracy)
              , sharpe = $filter('number')(el.sharpe, $scope.accuracy)
              , val = $filter('number')(el[givenTable[elem]['_short_val']], $scope.accuracy)
              , weight = $filter('number')(el.weight*100, 1) + '%'
              , amount = Math.floor(el.weight*dollars/el.price);

            portfolio.short.cells.push([sym, price, beta, sharpe, val, weight, amount]);
          });

          portfolios.push(portfolio);
        });

        //display
        $timeout(function() {
          if ($scope.percent && Math.round(total_percent) !== 100) {
            $scope.percentError = true;
            return;
          }
          else {
            $scope.percentError = false;
          }
          $scope.portfolios = portfolios;
          $scope.dollars = Math.floor(100*total_dollars/(100-cash));
          $scope.previous_pd = $scope.portfolio_dollars;
          $scope.previous_dollars = $scope.dollars;
        });
      }

      $scope.listTable = listTable;

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
