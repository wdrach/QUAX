module.exports.getTable = (req, res) => {
  var date = req.params.date;

  return res.json({
    _date: '20160926', //YYYYMMDD
    _q_metric_str: 'Price-to-Book', //String for our metric
    _q_metric_id: 'P/B:Q', //Bloomberg ID for our metric
    _v_metric_str: 'Price-to-Earnings',
    _v_metric_id: 'P/E:Q',
    _iv_metric_str: 'Implied Volatility, 3 Month, 100%', //apparently actually a metric itself
    _iv_metric_id: '3M IVOL 100% Mny',
    _m_metric_str: 'Price Rate of Change',
    _m_metric_id: 'Rate of Change:Period=1',
    NOW: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1 //Next week's price, -1 if current week
    },
    AOS: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1
    },
    BCR: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1
    },
    CHK: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1
    },
    DDR: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1
    },
    SCHW: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1
    },
    XRAY: {
      Q: Math.random()*10,
      V: Math.random()*10,
      IV: Math.random()*10,
      M: Math.random()*10,
      price: 304.6,
      future_price: -1
    }
  });
};
