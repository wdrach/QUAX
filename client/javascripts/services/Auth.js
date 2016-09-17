module.exports = function(app) {
  app.factory("Auth", ["$cookies", "$rootScope", "$q", "$http", "$timeout", "$state", function($cookies, $rootScope, $q, $http, $timeout, $state) {
    var Auth = {};

    Auth.getToken = function() {
      var deferred = $q.defer();
      if ($rootScope.token) {
        deferred.resolve($rootScope.token);
        return deferred.promise;
      }

      var token = $cookies.get('token');
      if (token) {
        deferred.resolve(token);
        $rootScope.token = token;
        return deferred.promise;
      }

      $timeout(function() {
        token = $cookies.get('token');
        if (token) {
          deferred.resolve(token);
          $rootScope.token = token;
          return deferred.promise;
        }

        deferred.reject(false);
      }, 100);

      return deferred.promise;
    }

    Auth.setToken = function(token) {
      $cookies.put("token", token);
      $rootScope.token = token;
      return;
    }

    Auth.logout = function() {
      $cookies.remove('token');
      if ($rootScope.token) delete $rootScope.token;
      $state.go('root');
      window.location.reload();
    }

    return Auth;
  }]);
}
