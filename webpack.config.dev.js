var webpack = require('webpack');

module.exports = {
  context: __dirname + '/client/javascripts',
  entry: './app.js',
  output: {
    path: __dirname + '/client/public',
    filename: 'bundle.js'
  },

  module: {
    loaders: [
      {test: /\.html$/, loaders: ["html"]},
      {test: /\.(gif|svg|ttf|eot)$/, loaders: ["file"]}
    ]
  }
};

