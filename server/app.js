var express = require('express')
  , logger = require('morgan')
  , errorHandler = require('errorhandler')
  , bodyParser = require('body-parser')
  , http = require('http')
  , path = require('path')
  , webpack = require('webpack')
  , passport = require('./helpers/auth.helper')();

var webpackConfigLocation = process.env.NODE_ENV !== 'production' ? '../webpack.config.dev.js' : '../webpack.config.prod.js';
console.log("Loading webpack config: " + webpackConfigLocation);
var webpackConfig = require(webpackConfigLocation);

var apiRouter = require('./routes/api.routes');
var authRouter = require('./routes/auth.routes');

var app = express();

app.set('port', process.env.PORT || 4000);
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, '../client/public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//api router
app.use('/api', apiRouter);

app.use('/auth', authRouter(passport));

app.use(function(req, res) {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

if (process.env.NODE_ENV === 'development') {
  app.use(errorHandler());
};

var compiler = webpack(webpackConfig);
//nodemon will restart when we need to build the webpack anyway
compiler.watch({aggregateTimeout: 100},function(err, stats) {
  console.log("Webpack built:");
  console.log(stats.toString());
  if (err) throw err;
});

var server = http.createServer(app).listen(process.env.PORT || app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
