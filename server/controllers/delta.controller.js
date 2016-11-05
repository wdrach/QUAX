var AWS = require('aws-sdk')
  , parse = require('csv-parse')
  , fs = require('fs');

var s3 = new AWS.S3();

module.exports.getCurrentQuantity = (req, res) => {
  var date = req.params.date;

  var bucketParams = {
    Bucket: 'quax',
    Key: 'current_clean/' + date + '_Current_Clean.json'
  };

  //attempt to get the clean JSON
  s3.getObject(bucketParams, function(err, data) {
    //if there's an error, we probably don't have the clean JSON
    if (err || !data) return cleanTable();
    var table = JSON.parse(data.Body.toString('utf8'));
    return res.json(table);
  });

  function cleanTable() {
    //get manually uploaded dirty CSV
    bucketParams.Key = 'current_dirty/' + date + '_Current_Dirty.csv';
    s3.getObject(bucketParams, function(err, data) {
      //doesn't exist
      if (err) return res.sendStatus(404);

      //get the string from the body
      var str = data.Body.toString('utf8');

      //use CSV parser to parse, windows style
      parse(str, {rowDelimiter: '\r\n'}, function(err, output) {
        if (err) return res.sendStatus(500);

        var labels = output[0];
        var longs = [];
        var shorts = [];

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

          if (entry.quantity < 0) shorts.push(entry);
          else longs.push(entry);
        });

        var buf = new Buffer(JSON.stringify(clean), 'utf-8');
        var putParams = {
          Bucket: 'quax',
          Key: 'current_clean/' + date + '_Current_Clean.json',
          Body: buf
        };

        s3.putObject(putParams, function(err, data) {
          if (err) return res.sendStatus(500);

          return res.json(clean);
        });
      });
    });
  }
};

module.exports.getValidDates = function(req, res) {
  var bucketParams = {
    Bucket: 'quax',
    Prefix: 'current_dirty'
  };

  s3.listObjects(bucketParams, function(err, data) {
    if (err) return res.sendStatus(500);
    var ret = {
      dates: data.Contents.map(function(obj) {
        return obj.Key.replace('current_dirty/', '').substring(0, 8);
      })
    };

    ret.dates.shift();
    res.json(ret);
  });
};