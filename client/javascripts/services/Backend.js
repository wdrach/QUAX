module.exports = function (app) {
  app.service('Backend', function ($cookies, $http, $state, $rootScope, $q, Auth) {
    var Backend = {};

    var get = function(uri) {
      var deferred = $q.defer();
      Auth.getToken().then(function(token) {
        $http.get(uri + '?access_token=' + token)
             .then(function(data) {
               deferred.resolve(data);
             }, function(response) {
               deferred.reject();
             });
      }, function(err) {
        return deferred.reject(err);
      });
      return deferred.promise;
    }

    var del = function(uri) {
      var deferred = $q.defer();
      Auth.getToken().then(function(token) {
        $http.delete(uri + '?access_token=' + token)
             .then(function(data) {
               deferred.resolve(data);
             }, function(response) {
               deferred.reject();
             });
      }, function(err) {
        return deferred.reject(err);
      });
      return deferred.promise;
    }

    var put = function(uri, body) {
      var deferred = $q.defer();
      Auth.getToken().then(function(token) {
        $http.put(uri + '?access_token=' + token, body)
             .then(function(data) {
               deferred.resolve(data);
             }, function(response) {
               deferred.reject();
             });
      }, function(err) {
        return deferred.reject(err);
      });
      return deferred.promise;
    }

    var post = function(uri, body) {
      var deferred = $q.defer();
      Auth.getToken().then(function(token) {
        $http.post(uri + '?access_token=' + token, body)
             .then(function(data) {
               deferred.resolve(data);
             }, function(response) {
               deferred.reject();
             });
      }, function(err) {
        return deferred.reject(err);
      });
      return deferred.promise;
    }

    Backend.loggedIn = function () {
      return get('/api/loggedIn');
    };

    return Backend;
  });
};
