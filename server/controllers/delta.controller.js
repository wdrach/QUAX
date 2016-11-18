var AWS = require('aws-sdk')
  , parse = require('csv-parse')
  , fs = require('fs');

var helper = require('../helpers/table.helper');

var getPortfolios = helper.getPortfolios
  , getTable = helper.getTable
  , getValidDates = helper.getValidDates;

var s3 = new AWS.S3();

module.exports.getCurrentQuantity = (req, res) => {
  var bucketParams = {
    Bucket: 'quax',
    Prefix: 'current_dirty'
  };
  var date = null;

  s3.listObjects(bucketParams, function(err, data) {
    if (err) return res.sendStatus(500);
    var ret = {
      dates: data.Contents.map(function(obj) {
        return obj.Key.replace('current_dirty/', '').substring(0, 8);
      })
    };

    ret.dates.shift();
    date = ret.dates[ret.dates.length - 1];

    bucketParams = {
      Bucket: 'quax',
      Key: 'current_clean/' + date + '_Current_Clean.json'
    };

    //attempt to get the clean JSON
    s3.getObject(bucketParams, function(err, data) {
      //if there's an error, we probably don't have the clean JSON
      if (err || !data) return cleanTable();
      var table = JSON.parse(data.Body.toString('utf8'));
      runDelta(table);
    });
  });


  function cleanTable() {
    //get manually uploaded dirty CSV
    bucketParams = {
      Bucket: 'quax',
      Key: 'current_dirty/' + date + '_Current_Dirty.csv'
    };

    s3.getObject(bucketParams, function(err, data) {
      //doesn't exist
      if (err) return res.sendStatus(404);

      //get the string from the body
      var str = data.Body.toString('utf8');

      //use CSV parser to parse, windows style
      parse(str, {rowDelimiter: '\r\n'}, function(err, output) {
        if (err) return res.sendStatus(500);

        var labels = output[0];
        var longs = {};
        var shorts = {};

        output.forEach(function(elem, i) {
          //ignore the labels
          if (i <= 1) return;

          var entry = {};

          labels.forEach(function(label, j) {
            if (label === 'Symbol') {
              entry.symbol = elem[j];
            }
            if (label === 'Quantity') {
              entry.quantity = parseInt(elem[j]);
            }
          });

          if (entry.quantity < 0) {
            entry.quantity = -1*entry.quantity;
            shorts[entry.symbol] = entry;
          }
          else longs[entry.symbol] = entry;
        });

        var clean = {long: longs, short: shorts};
        var buf = new Buffer(JSON.stringify(clean), 'utf-8');
        var putParams = {
          Bucket: 'quax',
          Key: 'current_clean/' + date + '_Current_Clean.json',
          Body: buf
        };

        s3.putObject(putParams, function(err, data) {
          if (err) return res.sendStatus(500);

          runDelta(clean);
        });
      });
    });
  }


  function runDelta(cur) {
    var used_symbols = [];
    var ret = {long: cur.long, short: cur.short};

    getValidDates(function(dates) {
      if (typeof(dates) === 'number') return res.sendStatus(dates);

      getTable(dates.dates[dates.dates.length - 1], function(table) {
        if (typeof(table) === 'number') return res.sendStatus(table);

        var prices = {};

        table.forEach(function(elem) {
          prices[elem.symbol] = elem.price;
        });

        var long_dollars = 0;
        for (var l in cur.long) {
          if (prices[cur.long[l].symbol] == undefined) continue;
          long_dollars += cur.long[l].quantity*prices[cur.long[l].symbol];
          cur.long[l].price = prices[cur.long[l].symbol];
        }


        var short_dollars = 0;
        for (var s in cur.short) {
          if (prices[cur.short[s].symbol] == undefined) continue;
          short_dollars += cur.short[s].quantity*prices[cur.short[s].symbol];
          cur.short[s].price = prices[cur.short[s].symbol];
        }

        ret.dollars = (long_dollars + short_dollars)/2;
        ret.short_dollars = short_dollars;
        ret.long_dollars = long_dollars;

        res.json(ret);
      });
    });
  };
};
