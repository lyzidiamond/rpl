#!/usr/bin/env node

var path = require('path'),
  http = require('http'),
  vm = require('vm'),
  st = require('st'),
  stringify = require('json-stringify-safe'),
  fs = require('fs'),
  instrument = require('./lib/instrument.js'),
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

function RPL(filename) {
  this.filename = filename;

  if (this.filename) {
    if (!fs.existsSync(this.filename)) {
      console.log('Creating new file %s', this.filename);
    } else {
      this.defaultValue = fs.readFileSync(this.filename, 'utf8');
    }
  }

  this.server = http.createServer(st({
    path: __dirname + '/static',
    url: '/',
    cache: false,
    index: 'index.html',
    dot: true
  }));
}

RPL.prototype.listen = function() {
  this.server.listen.apply(this.server, arguments);


  var onstream = function(stream) {

    // if you've started this up with a file argument,
    // send that file to the browser
    if (this.defaultValue) {
      stream.write(JSON.stringify({ defaultValue: this.defaultValue }));
    }

    var ondata = function(json) {
      var value = JSON.parse(json);

      if (value.command) {
        fs.writeFileSync(this.filename, value.value);
        return;
      }

      var abort = false;
      var thisTick = Date.now();
      var transformed = instrument(value.value, thisTick);

      // sandbox is on object of all the methods the code will have when
      // it runs inside of our temporary vm
      var sandbox = {
        INSTRUMENT: (function(thisTick) {
          var DATA = {};
          var TODO = transformed.TODO;
          return {
            log: function(name, number, val) {
              if (DATA[name + ':' + number] === undefined) {
                DATA[name + ':' + number] = [];
              }
              DATA[name + ':' + number].unshift({
                name: name,
                line: number,
                stringified: stringify(val)
              });
              TODO[name + ':' + number] = true;
              for (var k in TODO) {
                if (!TODO[k]) {
                  return;
                }
              }
              _UPDATE(thisTick);
            },
            TODO: TODO,
            DATA: DATA
          };
        })(thisTick),
        _UPDATE: _UPDATE,
        require: require,
        module: module,
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval
      };

      function _UPDATE(tick) {
        if (tick !== thisTick) return;
        process.nextTick(sendData);
      }

      function sendData() {
        if (!abort) stream.write(JSON.stringify(sandbox.INSTRUMENT.DATA));
      }

      try {
        // this could be smarter - the next version of node will support
        // a timeout for this context. for now, we'll just settle.
        vm.runInNewContext(transformed.result, sandbox, 'tmp.js');
      } catch(e) {
        // the vm will throw an error if the code has a syntax error
        // or something like that.
        stream.write(JSON.stringify({ error: e.message }));

        // make sure we don't send messages after this
        // that would hide the error.
        abort = true;
      }
    }.bind(this);

    // .on('data' is called when someone types some new code in the browser
    stream.on('data', ondata);

  }.bind(this);

  // shoe manages our connection to the browser and lets
  // us send messages back and forth with streams. under the hood
  // it's all websockets on modern browsers.
  var sock = shoe(onstream);

  sock.install(this.server, '/eval');

  this.sock = sock;
};

// horrible errors within the vm can bubble up in unexpected ways.
// we keep that from crashing the process by basically ignoring them
// here.
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

module.exports = RPL;
