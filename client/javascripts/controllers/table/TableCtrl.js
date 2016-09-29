module.exports = function(app) {
  app.controller('TableCtrl', [
    '$filter',
    '$scope',
    '$rootScope',
    '$sce',
    '$state',
    'Backend',
    function($filter, $scope, $rootScope, $sce, $state, Backend) {
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

      //Sort by this value
      $scope.sortBy = 'Symbol';
      //Ascending/Descending
      $scope.ascending = true;

      //how many values to have in the top/bottom tables
      $scope.N = 15;

      var labels = ['Symbol', 'Quality', 'Value', 'Implied Volatility', 'Momentum', 'Current Price'];

      var pastLabels = ['Symbol', 'Quality', 'Value', 'Implied Volatility', 'Momentum', 'Current Price', 'Future Price', 'Percent Difference'];

      $scope.displayTable = [];
      $scope.labels = labels;

      function sortObject(obj) {
        var lookup = {
          Symbol: 'symbol',
          Quality: 'Q',
          Value: 'V',
          'Implied Volatility': 'IV',
          Momentum: 'M',
          'Current Price': 'price'
        };

        var sb = lookup[$scope.sortBy];
        var out = [];
        for (var key in obj) {
          if (obj[key].symbol && obj[key].symbol !== '_') {
            out.push(obj[key]);
          }
        }

        out.sort(function (a, b) {
          var mod = $scope.ascending ? 1 : -1;
          if (a[sb] > b[sb]) return 1*mod;
          if (a[sb] < b[sb]) return -1*mod;
          return 0;
        });

        var newOut = [];
        out.forEach(function(elem) {
          if (sb === 'symbol' || typeof(elem[sb]) === 'number') newOut.push(elem);
        });

        return newOut;
      }

      function listTable(givenTable) {
        if ($scope.date === 'now') {

          //set the labels with the little arrow!
          var topLabels = [];
          var botLabels = [];
          labels.forEach(function(elem) {
            topLabels.push(elem);
            botLabels.push(elem);
          });
          var unicode = $scope.ascending ? ' \u25B2' : ' \u25BC';
          var bottom_unicode = $scope.ascending ? ' \u25BC' : ' \u25B2';
          topLabels[labels.indexOf($scope.sortBy)] = $sce.trustAsHtml(labels[labels.indexOf($scope.sortBy)] + unicode);
          botLabels[labels.indexOf($scope.sortBy)] = $sce.trustAsHtml(labels[labels.indexOf($scope.sortBy)] + bottom_unicode);
          $scope.topLabels = topLabels;
          $scope.botLabels = botLabels;

          //sort by the correct value
          var table = sortObject(givenTable);

          //get top/bottom N
          var top = table.splice(0, $scope.N);
          var bottom = table.splice(-1*($scope.N), $scope.N);

          //"crop" numbers to correct accuracy
          top.forEach(function(elem, i) {
            var sym = elem.symbol
              , Q = $filter('number')(elem.Q, $scope.accuracy)
              , V = $filter('number')(elem.V, $scope.accuracy)
              , IV = $filter('number')(elem.IV, $scope.accuracy)
              , M = $filter('number')(elem.M, $scope.accuracy)
              , price = '$' + $filter('number')(elem.price, 2);

            top[i] = [sym, Q, V, IV, M, price];
          });

          bottom.forEach(function(elem, i) {
            var sym = elem.symbol
              , Q = $filter('number')(elem.Q, $scope.accuracy)
              , V = $filter('number')(elem.V, $scope.accuracy)
              , IV = $filter('number')(elem.IV, $scope.accuracy)
              , M = $filter('number')(elem.M, $scope.accuracy)
              , price = '$' + $filter('number')(elem.price, 2);

            bottom[i] = [sym, Q, V, IV, M, price];
          });

          //display
          $scope.topTable = top;
          $scope.bottomTable = bottom.reverse();
        }
      }

      Backend.getTable($scope.date).then(function(data) {
        $scope.table = data.data;
        listTable(data.data);
      });

      $scope.changeSort = function(label) {
        var index = $scope.topLabels.indexOf(label) !== -1 ?
                    $scope.topLabels.indexOf(label) :
                    $scope.botLabels.indexOf(label);
        label = labels[index];
        if (label === $scope.sortBy) $scope.ascending = !$scope.ascending;
        else {
          $scope.sortBy = label;
          $scope.ascending = (label === 'Symbol') ? true : false;
        }

        listTable($scope.table);
      }
    }
  ]);
};
