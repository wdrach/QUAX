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
            $scope.got_table = JSON.parse(JSON.stringify(data.data));
            $scope.current = JSON.parse(JSON.stringify(cur_data.data));
            getCurrentPortfolios($scope.current, function(cur_port) {
              $scope.current_portfolios = JSON.parse(JSON.stringify(cur_port));
              listTable(data.data, cur_data.data, cur_port);
            });
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
      $scope.current_portfolios = {};
      $scope.cash = "5";
      $scope.percent = false;
      $scope.dollarError = false;
      $scope.percentError = false;
      $scope.portfolios = {};
      $scope.rebalance = {};
      $scope.rebalance_set = false;

      //round to N decimal points
      $scope.accuracy = 3;

      function getCurrentPortfolios(current, cb) {
        var date = current.date;
        Backend.getTable(date).then(function(data) {
          var table = data.data;
          var cur_port = {
            long: {},
            short: {}
          };
          var portfolio_keys = [];
          for (var key in table) {
            if (key[0] !== '_') {
              portfolio_keys.push(key);
            }
          };

          //init empty objects for all symbols
          for (var elem in current.long) {
            cur_port.long[elem] = {};
          }
          for (var elem in current.short) {
            cur_port.short[elem] = {};
          }

          portfolio_keys.forEach(function(key) {
            var longs = {};
            var shorts = {};
            table[key].long.forEach(function(i, ind) {
              longs[i.symbol] = ind;
            });
            table[key].short.forEach(function(i, ind) {
              shorts[i.symbol] = ind;
            });

            for (var elem in current.long) {
              cur_port.long[elem][key] = 0;
              if (longs[elem] !== undefined) {
                cur_port.long[elem][key] = table[key].long[longs[elem]].weight;
              }
            }
            for (var elem in current.short) {
              cur_port.short[elem][key] = 0;
              if (shorts[elem] !== undefined) {
                cur_port.short[elem][key] = table[key].short[shorts[elem]].weight;
              }
            }
          });

          //normalize each of the current portfolios
          for (var key in cur_port.short) {
            var total = 0;
            for (var port in cur_port.short[key]) {
              total += cur_port.short[key][port];
            }
            for (var port in cur_port.short[key]) {
              cur_port.short[key][port] = cur_port.short[key][port]/total;
            }

            if (total === 0) {
              cur_port.short[key].undef = 1;
            }
          }

          for (var key in cur_port.long) {
            var total = 0;
            for (var port in cur_port.long[key]) {
              total += cur_port.long[key][port];
            }
            for (var port in cur_port.long[key]) {
              cur_port.long[key][port] = cur_port.long[key][port]/total;
            }

            if (total === 0) {
              cur_port.long[key].undef = 1;
            }
          }

          //adjust from percentages to numbers
          for (var key in cur_port.short) {
            for (var port in cur_port.short[key]) {
              cur_port.short[key][port] = Math.round(current.short[key].quantity*cur_port.short[key][port]);
            }
          }
          for (var key in cur_port.long) {
            for (var port in cur_port.long[key]) {
              cur_port.long[key][port] = Math.round(current.long[key].quantity*cur_port.long[key][port]);
            }
          }

          cb(cur_port);
        });
      }

      function listTable(givenTable, current, cur_ports) {
        var portfolio_keys = ['undef'];
        for (var key in givenTable) {
          if (key[0] !== '_') {
            portfolio_keys.push(key);
          }
        };

        var portfolios = [];
        var cur_d = current.dollars;
        $scope.dollars = Math.floor(cur_d);
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

        var total_percent = cash;

        var table = {
          long: {},
          short: {}
        };

        portfolio_keys.forEach(function(elem) {
          //portfolios for rebalancing
          if (!$scope.rebalance_set) {
            $scope.rebalance[elem] = {long: true, short: true};
          }

          if (!$scope.rebalance[elem].long && !$scope.rebalance[elem].short) {
            return;
          }

          if ($scope.rebalance[elem].long) {
            for (var l in cur_ports.long) {
              if (!table.long[l]) {
                table.long[l] = {
                  symbol: l,
                  quantity: 0
                };
              }
              if (cur_ports.long[l][elem]) {
                table.long[l].quantity -= cur_ports.long[l][elem];
              }
            }
          }
          if ($scope.rebalance[elem].short) {
            for (var s in cur_ports.short) {
              if (!table.short[s]) {
                table.short[s] = {
                  symbol: s,
                  quantity: 0
                };
              }
              if (cur_ports.short[s][elem]) {
                table.short[s].quantity -= cur_ports.short[s][elem];
              }
            }
          }

          if (elem === 'undef') return;

          d = parseFloat($scope.portfolio_dollars[elem]);
          p = parseFloat($scope.portfolio_percent[elem]);
          if (!d || !$scope.portfolio_dollars[elem]) {
            $scope.portfolio_dollars[elem] = Math.floor(cur_d/portfolio_keys.length);
            $scope.previous_pd[elem] = Math.floor(cur_d/portfolio_keys.length);
            $scope.portfolio_percent[elem] = (100 - cash)/portfolio_keys.length;
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
            dollars = Math.floor(cur_d*p/(100-cash));
          }
          else {
            dollars = Math.floor($scope.portfolio_dollars[elem]);
          }

          //construct long portfolio
          if ($scope.rebalance[elem].long) {
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
          }

          //same for short
          if ($scope.rebalance[elem].short) {
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
          }

          portfolios.push({
            title: givenTable[elem]['_title'],
            key: elem
          });

        });

        //display
        $timeout(function() {
          if ($scope.percent && Math.round(total_percent) !== 100) {
            //portfolio dependent balancing messes this up
            //$scope.percentError = true;
            //return;
          }
          else {
            $scope.percentError = false;
          }
          $scope.table = table;
          $scope.previous_pd = $scope.portfolio_dollars;
          $scope.portfolios = portfolios;
          $scope.rebalance_set = true;
        });
      }

      $scope.listTable = listTable;

    }
  ]);
};
