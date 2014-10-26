#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2)),
  opener = require('opener'),
  chromeApp = require('chrome-app');
var RPL = require('./');

var rpl = new RPL(argv._[0]);

rpl.listen(1984, onlisten);

function onlisten(err, res) {
  var address = 'http://' +
      rpl.server.address().address + ':' +
      rpl.server.address().port;
  console.log('rpl running at %s', address);
  if (argv.b) {
    chromeApp(address, 'rpl');
  }
  if (argv.o) {
    opener(address);
  }
}
