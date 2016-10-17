//the easy, npm imports
var angular = require('angular');
var ngAnimate = require('angular-animate');
var ngTouch = require('angular-touch');
var ngSanitize = require('angular-sanitize');
var ngCookies = require('angular-cookies');

//ui.router is not a proper variable name, but that's what
//angular wants to load this lib as. Just requiring it raw
//fixes this problem
require('angular-ui-router');

//import the config before we init
var config = require('./config.js')(angular);

var app = angular.module('app', [
  'ngAnimate',
  'ngTouch',
  'ngSanitize',
  'ngCookies',
  'ui.router',
  'config'
]);

app.config(function($urlRouterProvider, $stateProvider, $httpProvider, $anchorScrollProvider, $locationProvider, $sceDelegateProvider) {
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/');
    // States
    // - Routes
    $stateProvider
        .state('root', {
          url: '/',
          template: require('../public/templates/app/root.html'),
          controller: 'RootCtrl'
        })
        .state('login-callback', {
          url: '/loginCallback/:token',
          template: require('../public/templates/app/login.html'),
          controller: 'LoginCallbackCtrl'
        })
        .state('fail', {
          url: '/fail',
          template: require('../public/templates/app/fail.html'),
          controller: 'FailCtrl'
        });

    // - The main table
    $stateProvider
      .state('table', {
        url: '/table',
        template: require('../public/templates/table/table.html'),
        controller: 'TableCtrl',
        resolve: {
          'currentAuth': ['$q', '$rootScope', 'Backend', function($q, $rootScope, Backend) {
            var def = $q.defer();
            Backend.loggedIn().then(function() {
              $rootScope.loggedIn = true;
              def.resolve();
            }, function() {
              $rootScope.loggedIn = false;
              def.reject();
            });

            return def.promise;
          }]
        }
      });
    $stateProvider
      .state('table-date', {
        url: '/table/:date',
        template: require('../public/templates/table/table.html'),
        controller: 'TableCtrl',
        resolve: {
          'currentAuth': ['$q', '$rootScope', 'Backend', function($q, $rootScope, Backend) {
            var def = $q.defer();
            Backend.loggedIn().then(function() {
              $rootScope.loggedIn = true;
              def.resolve();
            }, function() {
              $rootScope.loggedIn = false;
              def.reject();
            });

            return def.promise;
          }]
        }
      });
});

app.run(['$rootScope', '$state', function($rootScope, $state) {
  $rootScope.$on('$stateChangeError', function() {
    $state.go('root');
  });

  $rootScope.$on('$stateChangeStart', function() {
    return $rootScope.$emit('m.hide');
  });
}]);

require('./controllers')(app);
require('./services')(app);
