var AWS = require('aws-sdk')
  , parse = require('csv-parse');

var s3 = new AWS.S3()
  , bucket = 'quax';

/* Data format:
 * {
 *   _date: 'YYYYMMDD',
 *   _q_metric_str: <text description of q metric>,
 *   _q_metric_id: <Bloomberg field for the q metric>,
 *   _v_metric_str: <desc>,
 *   _v_metric_id: <id>,
 *   _iv_metric_str: <desc>,
 *   _iv_metric_id: <id>,
 *   _m_metric_str: <desc>,
 *   _m_metric_id: <id>,
 *   <symbol 1>: {
 *     Q: <Q value>,
 *     V: <val>,
 *     IV: <val>,
 *     M: <val>,
 *     price: <current price>,
 *     future_price: <future price>,
 *     sharpe: <1mo sharpe>,
 *     symbol: <symbol 1>,
 *     name: <full company name>,
 *     ticker: <bloomberg symbol, e.g. AAPL US EQUITY>
 *   },
 *   <symbol 2>: ...
 * }
 *
 * Clean JSON format:
 * [{
 *   ticker: <ticker>,
 *   symbol: <symbol>,
 *   name: <name>,
 *   <field1>: <val>,
 *   <field2> ...,
 *   price: <price>
 * }]
 *
 * where fields are ids that are either in the config
 * or might be used for some purpose. This INCLUDES
 * the sharpe ratio, which should be "Sharpe:M-1"
 */

//strings and bloomberg IDs for the values we are using
var config = {
  q_str: 'Price-to-Book',
  q_id: 'P/B:Q',
  v_str: 'Price-to-Earnings',
  v_id: 'P/E:Q',
  iv_str: 'Implied Volatility, 3 Month, 100%',
  iv_id: '3M IVOL 100% Mny',
  m_str: 'Price Rate of Change',
  m_id: 'Rate of Change: Period=1'
};

module.exports.getTable = (req, res) => {
  var date = req.params.date;

  var bucketParams = {
    Bucket: 'quax',
    Key: 'clean/' + date + '_Clean.json'
  };

  //attempt to get the clean JSON
  s3.getObject(bucketParams, function(err, data) {
    //if there's an error, we probably don't have the clean JSON
    if (err || !data) return cleanTable();
    var table = JSON.parse(data.Body.toString('utf8'));
    return sendTable(table);
  });

  function cleanTable() {
    //get manually uploaded dirty CSV
    bucketParams.Key = 'dirty/' + date + '_Dirty.csv';
    s3.getObject(bucketParams, function(err, data) {
      //doesn't exist
      if (err) return res.sendStatus(404);

      //get the string from the body
      var str = data.Body.toString('utf8');

      //use CSV parser to parse, windows style
      parse(str, {rowDelimiter: '\r\n'}, function(err, output) {
        if (err) return res.sendStatus(500);

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
          if (err) return res.sendStatus(500);

          return sendTable(clean);
        });
      });
    });
  }

  function sendTable(table) {
    var newTable = {};

    table.forEach(function(entry) {
      //build entry, pretty straightforward
      var newEntry = {
        IV: entry['2nd PUT IVOL 25 Delta']/entry['2nd PUT IVOL 50 Delta'],
        IVS: entry['2nd PUT IVOL 25 Delta']/entry['2nd PUT IVOL 50 Delta'],
        IVL: entry['2nd PUT IVOL 25 Delta']/entry['2nd PUT IVOL 50 Delta'],
        CDS: entry['5Y Mid Par CDS Sprd Ref Nm:D-1'],
        CDSS: entry['5Y Mid Par CDS Sprd Ref Nm:D-1'],
        CDSL: entry['5Y Mid Par CDS Sprd Ref Nm:D-1'],
        MFS: entry['Money Flow Total Weekly']/(entry['Money Flow Total Monthly'] - entry['Money Flow Total Weekly']),
        MFL: entry['Money Flow Block Monthly'],
        beta: entry['Beta:Y-3'],
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
      CDS: {
        long: [],
        short: [],
        _title: "CDS Spread",
        _long_header: "5yr. CDS Spread",
        _short_header: "5yr. CDS Spread",
        _short_val: "CDSS",
        _long_val: "CDSL"
      }
    };

    var IV = []
      , CDS = []
      , MFL = []
      , MFS = [];

    //this is a shitty way to do this, but it's the only way I can think
    //to remove null values before sorting
    for (var entry in newTable) {
      var b = newTable[entry].beta;
      if (newTable[entry].IV && b) IV.push(newTable[entry]);
      if (newTable[entry].CDS && b) CDS.push(newTable[entry]);
      if (newTable[entry].MFL && b) MFL.push(newTable[entry]);
      if (newTable[entry].MFS && b) MFS.push(newTable[entry]);
    }

    IV = IV.sort(function(a, b) {
      return b.IV - a.IV;
    });
    CDS = CDS.sort(function(a, b) {
      return b.CDS - a.CDS;
    });
    MFL = MFL.sort(function(a, b) {
      return b.MFL - a.MFL;
    });
    MFS = MFS.sort(function(a, b) {
      return b.MFS - a.MFS;
    });

    out.IV.long = IV.splice(0, 15);
    out.IV.short = IV.splice(-15, 15).reverse();
    out.CDS.long = CDS.splice(0, 15);
    out.CDS.short = CDS.splice(-15, 15).reverse();
    out.MF.long = MFL.splice(0, 10);
    out.MF.short = MFS.splice(-15, 15).reverse();

    //have to flip betas for shorts
    for (var key in out.IV.short) {
      out.IV.short[key].beta = -1*out.IV.short[key].beta;
    }
    for (var key in out.CDS.short) {
      out.CDS.short[key].beta = -1*out.CDS.short[key].beta;
    }
    for (var key in out.MF.short) {
      out.MF.short[key].beta = -1*out.MF.short[key].beta;
    }

    //compute betas
    var beta = 0;
    var short_weight = .022;
    var long_weight = .022;
    for (var i in out.IV.short) {
      beta += out.IV.short[i].beta*short_weight;
    }
    for (var i in out.IV.long) {
      beta += out.IV.long[i].beta*long_weight;
    }
    out.IV.beta = beta;
    beta = 0;
    for (var i in out.CDS.short) {
      beta += out.CDS.short[i].beta*short_weight;
    }
    for (var i in out.CDS.long) {
      beta += out.CDS.long[i].beta*long_weight;
    }
    out.CDS.beta = beta;
    beta = 0;
    long_weight = .033;
    for (var i in out.MF.short) {
      beta += out.MF.short[i].beta*short_weight;
    }
    for (var i in out.MF.long) {
      beta += out.MF.long[i].beta*long_weight;
    }
    out.MF.beta = beta;

    //:shipit:
    return res.json(out);
  }
};

module.exports.getValidDates = function(req, res) {
  var bucketParams = {
    Bucket: 'quax',
    Prefix: 'dirty'
  };

  s3.listObjects(bucketParams, function(err, data) {
    if (err) return res.sendStatus(500);
    var ret = {
      dates: data.Contents.map(function(obj) {
        return obj.Key.replace('dirty/', '').substring(0, 8);
      })
    };

    ret.dates.shift();
    res.json(ret);
  });
};
