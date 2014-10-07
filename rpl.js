#!/usr/bin/env node
// very inspired by mistakes and morkdown
var path = require('path'),
  http = require('http'),
  vm = require('vm'),
  st = require('st'),
  fs = require('fs'),
  argv = require('minimist')(process.argv.slice(2)),
  chromeApp = require('chrome-app'),
  opener = require('opener'),
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

  // shoe manages our connection to the browser and lets
  // us send messages back and forth with streams. under the hood
  // it's all websockets on modern browsers.
  var sock = shoe(function(stream) {

    // if you've started this up with a file argument,
    // send that file to the browser
    if (this.defaultValue) {
      stream.write(JSON.stringify({ defaultValue: this.defaultValue }));
    }

    // .on('data' is called when someone types some new code in the browser
    stream.on('data', function(d) {
      var abort = false;
      var thisTick = Date.now();
      var transformed = instrument(d, thisTick);

      // sandbox is on object of all the methods the code will have when
      // it runs inside of our temporary vm
      var sandbox = {
        INSTRUMENT: (function(thisTick) {
          var DATA = {};
          var TODO = transformed.TODO;
          return {
            log: function(name, number, val) {
              DATA[name + ':' + number] = {
                name: name,
                line: number,
                stringified: JSON.stringify(val)
              };
              TODO[name + ':' + number] = true;
              for (var k in TODO) {
                if (!TODO[k]) {
                  console.log('waiting for more', k);
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
        console.log(tick, thisTick);
        if (tick !== thisTick) return;
        process.nextTick(function() {
          if (!abort) stream.write(JSON.stringify(sandbox.INSTRUMENT.DATA));
        });
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
    });
  }.bind(this));

  sock.install(this.server, '/eval');

  this.sock = sock;
};

// horrible errors within the vm can bubble up in unexpected ways.
// we keep that from crashing the process by basically ignoring them
// here.
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

// Given a string of source code, look for our magic kind of comment
// and transform those comments into actual code that records the value
// of variables at a point in time.
//
// The process is really similar to code instrumentation used for
// coverage testing - for instance, how istanbul and bunker go about
// their business. But this is only for when the user explicitly
// wants instrumentation, and it uses dumb string operations instead
// of a real parser or code rewriter.
function instrument(str, tick) {
  var hasInstrument = false;
  var TODO = {};
  var result = str.split('\n')
    // if a line has a magic comment, replace the comment with
    // instrumentation code
    .map(function(line, i) {
      if (line.match(/\/\/=/)) {
        return line.replace(/(\/\/=)(.*)$/, function(match, _, name, offset) {
          hasInstrument = true;
          TODO[name + ':' + i] = false;
          // the function INSTRUMENT is implement above as a part of
          // the context given to vm.runInNewContext
          return ';INSTRUMENT.log(' +
              '"' + name + '"' +
              ',' +
              i + ',' + name + ');';
        });
      } else {
        return line;
      }
      // finally, hit it with a final update call. the way that we're working
      // here is async - _UPDATE() can be called later on by anything that
      // calls INSTRUMENT(), but we call it here just in case all code
      // is sync.
    }).join('\n') + '\n;_UPDATE(' + tick + ');';
  return {
    hasInstrument: hasInstrument,
    result: result,
    TODO: TODO
  };
}

module.exports = Mistakes;

var takes = new Mistakes(argv._[0]);

takes.listen(null, function(err, res) {
  var address = 'http://' +
      takes.server.address().address + ':' +
      takes.server.address().port;
  console.log('rpl running at %s', address);
  if (argv.b) {
    chromeApp(address);
  }
  if (argv.o) {
    opener(address);
  }
});
