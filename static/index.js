var through = require('through');
var shoe = require('shoe');
var CodeMirror = require('codemirror');
require('./js/javascript')(CodeMirror);
var fs = require('fs');
var insertCss = require('insert-css');

insertCss(fs.readFileSync(__dirname + '/css/monokai.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/css/codemirror.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/css/site.css', 'utf8'));

var stream = shoe('/eval');
var error = document.getElementById('error');
var evalIndicator = document.getElementById('eval-indicator');
var widgets = [];
var evalPause = false;
var delayedClear;

function makeWidget(name, x) {
  var indent = false;
  var msg = document.createElement('div');
  msg.className = 'data';
  var pre = msg.appendChild(document.createElement('pre'));
  pre.appendChild(document.createTextNode(x));
  pre.onclick = function() {
    indent = !indent;
    pre.innerHTML = JSON.stringify(JSON.parse(x), null, indent ? 2 : null);
  };
  var n = msg.appendChild(document.createElement('div'));
  n.className = 'data-name';
  n.innerHTML = name;
  return msg;
}

function clearData() {
  widgets.forEach(function(w) {
    editor.removeLineWidget(w);
  });
  widgets = [];
}

function read(str) {
  var d = JSON.parse(str);

  if (d.defaultValue) {
    editor.setValue(d.defaultValue);
    return;
  }

  clearTimeout(delayedClear);

  if (d.error) {
    error.style.display = 'block';
    error.innerHTML = d.error;
    delayedClear = setTimeout(clearData, 1000);
  } else {
    error.style.display = 'none';
    clearData();
    widgets = values(d).map(function(val) {
      return editor.addLineWidget(
        val.line,
        makeWidget(val.name, val.stringified), {
          coverGutter: false,
          noHScroll: true
        });
    });
  }
}

function togglePauseEval() {
  evalPause = !evalPause;
  if (evalPause) {
    evalIndicator.innerHTML = 'paused';
    evalIndicator.className = '';
  } else {
    evalIndicator.innerHTML = 'live';
    evalIndicator.className = 'quiet';
  }
  return false;
}

evalIndicator.onclick = togglePauseEval;

function values(d) {
  return Object.keys(d).map(function(k) { return d[k]; });
}

var editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  indentUnit: 2,
  mode: 'text/javascript',
  lineNumbers: true,
  autofocus: true,
  extraKeys: {
    'Ctrl-E': togglePauseEval,
    'Cmd-E': togglePauseEval
  }
});

editor.setOption('theme', 'monokai');

editor.on('change', function() {
  if (evalPause) return;
  clearTimeout(delayedClear);
  stream.write(editor.getValue());
});

stream.pipe(through(read));
