var helper = require('../helpers/table.helper');
var getPortfolios = helper.getPortfolios
  , getValidDates = helper.getValidDates;

module.exports.getTable = (req, res) => {
  getPortfolios(req.params.date, function(table) {
    if (typeof(table) === 'number') return res.sendStatus(table);
    res.json(table);
  });
};

module.exports.getValidDates = function(req, res) {
  getValidDates(function(dates) {
    if (typeof(dates) === 'number') return res.sendStatus(dates);
    res.json(dates);
  });
};
