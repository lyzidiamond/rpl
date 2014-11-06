#!/usr/bin/env node

var path = require('path'),
  http = require('http'),
  streams = require('./shared/streams.js'),
  through = require('through'),
  st = require('st'),
  terrariumStream = require('terrarium-stream').Node,
  stringify = require('json-stringify-safe'),
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

    stream.pipe(streams.fromJSON())
      .pipe(terrariumStream())
      .pipe(streams.toJSON())
      .pipe(stream);

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
