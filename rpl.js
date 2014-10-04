#!/usr/bin/env node
// very inspired by mistakes.
var path = require('path'),
  http = require('http'),
  vm = require('vm'),
  st = require('st'),
  fs = require('fs'),
  shoe = require('shoe');

// from https://github.com/joyent/node/blob/master/lib/repl.js
module.filename = path.resolve('rpl');
module.paths = require('module')._nodeModulePaths(module.filename);

function writeHead(res, contentType) {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
}

function Mistakes(filename) {
  this.mistakesStatic = st({
    path: __dirname + '/static',
    url: '/',
    cache: false,
    index: 'index.html',
    dot: true
  });

  if (filename) {
    this.defaultValue = fs.readFileSync(filename, 'utf8');
  }

  this.server = http.createServer(function(req, res) {
    this.mistakesStatic(req, res);
  }.bind(this));
}

Mistakes.prototype.listen = function() {
  this.server.listen.apply(this.server, arguments);

  var sock = shoe(function(stream) {
    if (this.defaultValue) {
      stream.write(JSON.stringify({ defaultValue: this.defaultValue }));
    }
    stream.on('data', function(d) {
      var abort = false;
      var sandbox = {
        INSTRUMENT: (function() {
          var DATA = [];
          return {
            log: function(name, number, val) {
              DATA.push({
                name: name,
                line: number,
                stringified: JSON.stringify(val)
              });
              _UPDATE();
            },
            DATA: DATA
          };
        })(),
        _UPDATE: _UPDATE,
        require: require,
        module: module
      };
      function _UPDATE() {
        process.nextTick(function() {
          if (!abort) stream.write(JSON.stringify(sandbox.INSTRUMENT.DATA));
        });
      }
      var transformed = instrument(d);
      try {
        vm.runInNewContext(transformed.result, sandbox, 'tmp.js');
      } catch(e) {
        stream.write(JSON.stringify({ error: e.message }));
        // make sure we don't send messages after this
        // that would hide the error.
        abort = true;
      }
    });
  }.bind(this));

  sock.install(this.server, '/eval');

  this.sock = sock;
};

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

function instrument(str) {
  var hasInstrument = false;
  var result = str.split('\n')
    .map(function(line, i) {
      if (line.match(/\/\/=/)) {
        return line.replace(/(\/\/=)(.*)$/, function(match, _, name, offset, string) {
          hasInstrument = true;
          return ';INSTRUMENT.log(' +
              '"' + name + '"' +
              ',' +
              i + ',' + name + ');';
        });
      } else {
        return line;
      }
    }).join('\n') + '\n;_UPDATE();';
  return {
    hasInstrument: hasInstrument,
    result: result
  };
}

module.exports = Mistakes;

var takes = new Mistakes(process.argv[2]);

takes.listen(3000);
