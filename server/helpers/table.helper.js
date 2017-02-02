var AWS = require('aws-sdk')
  , parse = require('csv-parse')
  , fs = require('fs');

var s3 = new AWS.S3()
  , bucket = 'quax';

var beta_file = JSON.parse(fs.readFileSync(__dirname + '/../betas/Betas.json'));
var betas = {};
for (var n in beta_file) {
  betas[beta_file[n].Ticker] = beta_file[n];
}
delete beta_file;

function calculateBeta(p) {
  var beta = 0;

  for (var i in p.short) {
    beta += p.short[i].beta*p.short[i].weight;
  }
  for (var i in p.long) {
    beta += p.long[i].beta*p.long[i].weight;
  }

  p.beta = beta;

  return p;
};

function balanceBetas(p) {
  while (p.beta < -.2 || p.beta > .2) {
    if (p.beta < -.2) {
      var worst = -1;
      var best = -1;
      var worst_beta = 2;
      var best_beta = -2;

      for (var sym in p.short) {
        var b = p.short[sym].beta*p.short[sym].weight;
        if (b < worst_beta && p.short[sym].weight >= .001) {
          worst = sym;
          worst_beta = b;
        }
        if (b > best_beta && p.short[sym].weight >= .001) {
          best = sym;
          best_beta = b;
        }
      }

      p.short[best].weight += .001;
      p.short[worst].weight -= .001;
    }
    if (p.beta > .2) {
      var worst = -1;
      var best = -1;
      var worst_beta = -2;
      var best_beta = 2;

      for (var sym in p.long) {
        var b = p.long[sym].beta*p.long[sym].weight;
        if (b > worst_beta && p.long[sym].weight >= .001) {
          worst = sym;
          worst_beta = b;
        }
        if (b < best_beta && p.long[sym].weight >= .001) {
          best = sym;
          best_beta = b;
        }
      }

      p.long[best].weight += .001;
      p.long[worst].weight -= .001;
    }
    p = calculateBeta(p);
  }

  return p;
};

module.exports.getTable = (date, cb) => {
  if (!date) return cb(400);

  var bucketParams = {
    Bucket: 'quax',
    Key: 'clean/' + date + '_Clean.json'
  };

  //attempt to get the clean JSON
  s3.getObject(bucketParams, function(err, data) {
    //if there's an error, we probably don't have the clean JSON
    if (err || !data) return cleanTable();
    var table = JSON.parse(data.Body.toString('utf8'));
    cb(table);
  });

  function cleanTable() {
    //get manually uploaded dirty CSV
    bucketParams.Key = 'dirty/' + date + '_Dirty.csv';
    s3.getObject(bucketParams, function(err, data) {
      //doesn't exist
      if (err) return cb(404);

      //get the string from the body
      var str = data.Body.toString('utf8');

      //use CSV parser to parse, windows style
      parse(str, {rowDelimiter: '\r\n'}, function(err, output) {
        if (err) return cb(500);

        var labels = output[2];
        var clean = [];
        var symbols = [];

        output.forEach(function(elem, i) {
          //ignore the labels
          if (i <= 3) return;

          var entry = {};

          labels.forEach(function(label, j) {
            //bloomberg adds newlines on their labels....
            label = label.replace('\n', '');
            //don't care about these
            if (label === 'Weight' || label === 'Shares') return;
            //clean up a few values
            if (label === 'Price' || label === 'Price:D-1') {
              entry.price = parseFloat(elem[j]);
              return;
            }
            if (label === 'Ticker') {
              //e.g. "AAPL US EQUITY"
              entry.ticker = elem[j];
              //just the stuff before the space
              //e.g. "AAPL"
              entry.symbol = elem[j].slice(0, elem[j].indexOf(' '));
              return;
            }
            if (label === 'Name') {
              entry.name = elem[j];
              return;
            }
            //the rest should be metric IDs
            entry[label] = parseFloat(elem[j]);
          });

          if (entry.symbol && entry.symbol !== 'RIY' && symbols.indexOf(entry.symbol) === -1) {
            clean.push(entry);
            symbols.push(entry.symbol);
          }
        });

        var buf = new Buffer(JSON.stringify(clean), 'utf-8');
        var putParams = {
          Bucket: 'quax',
          Key: 'clean/' + date + '_Clean.json',
          Body: buf
        };

        s3.putObject(putParams, function(err, data) {
          if (err) return cb(500);

          cb(clean);
        });
      });
    });
  }
}

module.exports.getPortfolios = (date, cb) => {
  if (!date) return cb(400);

  module.exports.getTable(date, function(table) {
    if (typeof(table) === 'number') return cb(res.sendStatus(table));
    sendTable(table);
  });

  function sendTable(table) {
    var newTable = {};

    table.forEach(function(entry) {
      //ignore things not in universe
      if (!betas[entry.symbol.replace('/','')]) return;
      //build entry, pretty straightforward
      var newEntry = {
        IV: entry['2nd PUT IVOL 25 Delta']/entry['2nd PUT IVOL 50 Delta'],
        IVS: entry['2nd PUT IVOL 25 Delta']/entry['2nd PUT IVOL 50 Delta'],
        IVL: entry['2nd PUT IVOL 25 Delta']/entry['2nd PUT IVOL 50 Delta'],
        MFS: entry['Money Flow Total Weekly']/(entry['Money Flow Total Monthly'] - entry['Money Flow Total Weekly']),
        MFL: entry['Money Flow Block Monthly'],
        SENS: entry['BEst Target Px:M-1']/entry.price,
        SENL: entry['News Sent Dly Avg:D-2'],
        beta: betas[entry.symbol.replace('/','')].Beta,
        price: entry.price,
        sharpe: entry['Sharpe:M-1'],
        symbol: entry.symbol,
        ticker: entry.ticker
      };

      newTable[entry.symbol] = newEntry;
    });

    var out = {
      IV: {
        long: [],
        short: [],
        _title: "Implied Volatility",
        _short_header: "Implied Volatility",
        _long_header: "Implied Volatility",
        _short_val: "IVS",
        _long_val: "IVL"
      },
      MF: {
        long: [],
        short: [],
        _title: "Money Flow",
        _short_header: "Ratio of MF Change",
        _long_header: "Block Money Flow Monthly",
        _short_val: "MFS",
        _long_val: "MFL"
      },
      SEN: {
        long: [],
        short: [],
        _title: "Investor Sentiment",
        _long_header: "Daily Sentiment Average",
        _short_header: "Target Price Ratio",
        _short_val: "SENS",
        _long_val: "SENL"
      }
    };

    var IV = []
      , SENS = []
      , SENL = []
      , MFL = []
      , MFS = [];

    //this is a shitty way to do this, but it's the only way I can think
    //to remove null values before sorting
    for (var entry in newTable) {
      var b = newTable[entry].beta;
      if (newTable[entry].IV && b) IV.push(JSON.parse(JSON.stringify(newTable[entry])));
      if (newTable[entry].SENS && b) SENS.push(JSON.parse(JSON.stringify(newTable[entry])));
      if (newTable[entry].SENL && b) SENL.push(JSON.parse(JSON.stringify(newTable[entry])));
      if (newTable[entry].MFL && b) MFL.push(JSON.parse(JSON.stringify(newTable[entry])));
      if (newTable[entry].MFS && b) MFS.push(JSON.parse(JSON.stringify(newTable[entry])));
    }

    IV = IV.sort(function(a, b) {
      return b.IV - a.IV;
    });
    SENS = SENS.sort(function(a, b) {
      return b.SENS - a.SENS;
    });
    SENL = SENL.sort(function(a, b) {
      return b.SENL - a.SENL;
    });
    MFL = MFL.sort(function(a, b) {
      return b.MFL - a.MFL;
    });
    MFS = MFS.sort(function(a, b) {
      return b.MFS - a.MFS;
    });

    out.IV.long = IV.splice(0, 15);
    out.IV.short = IV.splice(-15, 15).reverse();
    out.SEN.long = SENL.splice(0, 15);
    out.SEN.short = SENS.splice(-15, 15).reverse();
    out.MF.long = MFL.splice(0, 10);
    out.MF.short = MFS.splice(-15, 15).reverse();

    //have to flip betas for shorts
    for (var key in out.IV.short) {
      out.IV.short[key].beta = -1*out.IV.short[key].beta;
    }
    for (var key in out.SEN.short) {
      out.SEN.short[key].beta = -1*out.SEN.short[key].beta;
    }
    for (var key in out.MF.short) {
      out.MF.short[key].beta = -1*out.MF.short[key].beta;
    }

    //compute betas
    var short_weight = .0666;
    var long_weight = .0666;
    for (var i in out.IV.short) {
      out.IV.short[i].weight = short_weight;
    }
    for (var i in out.IV.long) {
      out.IV.long[i].weight = long_weight;
    }
    out.IV = calculateBeta(out.IV);
    //out.IV = balanceBetas(out.IV);

    for (var i in out.SEN.short) {
      out.SEN.short[i].weight = short_weight;
    }
    for (var i in out.SEN.long) {
      out.SEN.long[i].weight = long_weight;
    }
    out.SEN = calculateBeta(out.SEN);
    //out.SEN = balanceBetas(out.SEN);

    long_weight = .1;
    for (var i in out.MF.short) {
      out.MF.short[i].weight = short_weight;
    }
    for (var i in out.MF.long) {
      out.MF.long[i].weight = long_weight;
    }
    out.MF = calculateBeta(out.MF);
    //out.MF = balanceBetas(out.MF);

    //:shipit:
    cb(out);
  }
};

module.exports.getValidDates = function(cb) {
  var bucketParams = {
    Bucket: 'quax',
    Prefix: 'dirty'
  };

  s3.listObjects(bucketParams, function(err, data) {
    if (err) return cb(500);
    var ret = {
      dates: data.Contents.map(function(obj) {
        return obj.Key.replace('dirty/', '').substring(0, 8);
      })
    };

    ret.dates.shift();
    cb(ret);
  });
};
