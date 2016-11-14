module.exports = function(app) {
  app.controller('DeltaCtrl', [
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
        $scope.date = $scope.dates[$scope.dates.length - 1];
        if ($stateParams.date) {
          $scope.date = $stateParams.date;
        }
        $scope.selectDate = $scope.date;

        Backend.getTable($scope.date).then(function(data) {
          Backend.getCurrentQuantity().then(function(cur_data) {
            $scope.got_table = data.data;
            $scope.current = cur_data.data;
            listTable(data.data, cur_data.data);
          });
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
      $scope.portfolios = {};

      //round to N decimal points
      $scope.accuracy = 3;

      function listTable(givenTable, current) {
        var portfolio_keys = [];
        for (var key in givenTable) {
          if (key[0] !== '_') {
            portfolio_keys.push(key);
          }
        };

        var portfolios = [];
        var cur_d = current.dollars;
        $scope.dollars = cur_d;
        var cash = parseFloat($scope.cash);
        if (isNaN(cash) || cash > 100) {
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

        var table = {
          long: current.long,
          short: current.short
        };

        //flip quantity to buy for currently owned stocks
        for (var l in table.long) {
          table.long[l].quantity = -1*table.long[l].quantity;
        }
        for (var s in table.short) {
          table.short[s].quantity = -1*table.short[s].quantity;
        }

        portfolio_keys.forEach(function(elem) {
          d = parseFloat($scope.portfolio_dollars[elem]);
          p = parseFloat($scope.portfolio_percent[elem]);
          if (!d || !$scope.portfolio_dollars[elem]) {
            $scope.portfolio_dollars[elem] = Math.floor(cur_d/portfolio_keys.length);
            $scope.previous_pd[elem] = Math.floor(cur_d/portfolio_keys.length);
            $scope.portfolio_percent[elem] = (100 - cash)/portfolio_keys.length;
          }
          else if (rebalance) {
            $scope.portfolio_dollars[elem] = Math.floor(d*$scope.previous_pd[elem]/$scope.previous_dollars);
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
            dollars = Math.floor(d*p/100);
          }
          else {
            dollars = Math.floor($scope.portfolio_dollars[elem]);
          }
          total_dollars += dollars;

          //construct long portfolio
          givenTable[elem].long.forEach(function(el) {
            var sym = el.symbol
              , amount = Math.floor(el.weight*dollars/el.price);

            if (table.long[sym]) {
              table.long[sym].quantity += amount;
            }
            else {
              table.long[sym] = {
                symbol: sym,
                quantity: amount
              };
            }
          });

          //same for short
          givenTable[elem].short.forEach(function(el) {
            var sym = el.symbol
              , amount = Math.floor(el.weight*dollars/el.price);

            if (table.short[sym]) {
              table.short[sym].quantity += amount;
            }
            else {
              table.short[sym] = {
                symbol: sym,
                quantity: amount
              };
            }
          });

          portfolios.push({
            title: givenTable[elem]['_title'],
            key: elem
          });

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
          $scope.table = table;
          $scope.dollars = Math.floor(100*total_dollars/(100-2*cash));
          $scope.previous_pd = $scope.portfolio_dollars;
          $scope.previous_dollars = $scope.dollars;
          $scope.portfolios = portfolios;
        });
      }

      $scope.listTable = listTable;

    }
  ]);
};
