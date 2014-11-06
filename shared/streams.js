var through = require('through');

module.exports.fromJSON = function() {
  return through(function(data) {
    this.queue(JSON.parse(data));
  });
};

module.exports.toJSON = function() {
  return through(function(data) {
    this.queue(JSON.stringify(data));
  });
};
