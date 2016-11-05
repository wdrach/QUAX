var helper = require('../helpers/table.helper');
var getPortfolios = helper.getPortfolios
  , getValidDates = helper.getValidDates;

module.exports.getTable = (req, res) => {
  var table = getPortfolios(req.params.date);
  if (typeof(table) === 'number') return res.sendStatus(table);
  res.json(table);
};

module.exports.getValidDates = function(req, res) {
  var dates = getValidDates();
  if (typeof(dates) === 'number') return res.sendStatus(dates);
  res.json(dates);
};
