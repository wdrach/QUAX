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
  //for testing
  /*return sendTable([
    {
      'P/B:Q': Math.random()*50,
      'Rate of Change: Period=1': Math.random()*50,
      '3M IVOL 100% Mny': Math.random()*50,
      'P/E:Q': Math.random()*50,
      price: Math.random()*100,
      symbol: 'BLAB',
      ticker: 'BLAB US EQUITY'
    },
    {
      'P/B:Q': Math.random()*50,
      'Rate of Change: Period=1': Math.random()*50,
      '3M IVOL 100% Mny': Math.random()*50,
      'P/E:Q': Math.random()*50,
      price: Math.random()*100,
      symbol: 'CLAB',
      ticker: 'CLAB US EQUITY'
    },
    {
      'P/B:Q': Math.random()*50,
      'Rate of Change: Period=1': Math.random()*50,
      '3M IVOL 100% Mny': Math.random()*50,
      'P/E:Q': Math.random()*50,
      price: Math.random()*100,
      symbol: 'DLAB',
      ticker: 'DLAB US EQUITY'
    },
    {
      'P/B:Q': Math.random()*50,
      'Rate of Change: Period=1': Math.random()*50,
      '3M IVOL 100% Mny': Math.random()*50,
      'P/E:Q': Math.random()*50,
      price: Math.random()*100,
      symbol: 'ELAB',
      ticker: 'ELAB US EQUITY'
    },
    {
      'P/B:Q': Math.random()*50,
      'Rate of Change: Period=1': Math.random()*50,
      '3M IVOL 100% Mny': Math.random()*50,
      'P/E:Q': Math.random()*50,
      price: Math.random()*100,
      symbol: 'FLAB',
      ticker: 'FLAB US EQUITY'
    },
    {
      'P/B:Q': Math.random()*50,
      'Rate of Change: Period=1': Math.random()*50,
      '3M IVOL 100% Mny': Math.random()*50,
      'P/E:Q': Math.random()*50,
      price: Math.random()*100,
      symbol: 'GLAB',
      ticker: 'GLAB US EQUITY'
    }
  ]);*/
  var date = req.params.date;

  //currently only building out "Now" functionality, so date
  //is locked at 2016 09 19
  date = '20160919';

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

        var labels = output[0];
        var clean = [];
        var symbols = [];

        output.forEach(function(elem, i) {
          //ignore the labels
          if (i === 0) return;

          var entry = {};

          labels.forEach(function(label, j) {
            //bloomberg adds newlines on their labels....
            label = label.replace('\n', '');
            //don't care about these
            if (label === 'Weight' || label === 'Shares') return;
            //clean up a few values
            if (label === 'Price') {
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

        console.log(JSON.stringify(clean, null, 2));

        var buf = Buffer.from(JSON.stringify(clean));
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
    //set metadata
    var out = {
      _date: date,
      _q_metric_str: config.q_str,
      _q_metric_id: config.q_id,
      _v_metric_str: config.v_str,
      _v_metric_id: config.v_id,
      _iv_metric_str: config.iv_str,
      _iv_metric_id: config.iv_id,
      _m_metric_str: config.m_str,
      _m_metric_id: config.m_id
    };

    table.forEach(function(entry) {
      //build entry, pretty straightforward
      var newEntry = {
        Q: entry[config.q_id],
        V: entry[config.v_id],
        IV: entry[config.iv_id],
        M: entry[config.m_id],
        price: entry.price,
        sharpe: entry['Sharpe:M-1'],
        symbol: entry.symbol,
        ticker: entry.ticker
      };
      out[entry.symbol] = newEntry;
    });

    //:shipit:
    return res.json(out);
  }
};
