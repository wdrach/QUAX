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
        .state('login', {
          url: '/login',
          template: require('../public/templates/app/login.html'),
          controller: 'LoginCtrl'
        });

    // - The main table
    $stateProvider
        .state('term', {
          url: '/table',
          template: require('../public/templates/table/table.html'),
          controller: 'TermCtrl'
        });
});

require('./controllers')(app);
require('./services')(app);
