// preprocessing
var fs = require('fs');
var insertCss = require('insert-css');
insertCss(fs.readFileSync(__dirname + '/css/vibrant-ink.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/css/codemirror.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/css/site.css', 'utf8'));

var through = require('through');
var shoe = require('shoe');

var CodeMirror = require('codemirror');
require('./js/javascript')(CodeMirror);

var stream = shoe('/eval');

var error = document.getElementById('error');

var evalPause = false,
  globalIndent = false,
  widgets = [],
  delayedClear = null;

document.getElementById('evaluate').onchange = function(e) {
  evalPause = !!e.target.checked;
};

document.getElementById('indent').onchange = function(e) {
  globalIndent = !!e.target.checked;
};

var editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  indentUnit: 2,
  mode: 'text/javascript',
  lineNumbers: true,
  autofocus: true,
  extraKeys: {
    'Ctrl-S': save,
    'Cmd-S': save
  }
});

editor.setOption('theme', 'vibrant-ink');

editor.on('change', function() {
  if (evalPause) return;
  clearTimeout(delayedClear);
  stream.write(JSON.stringify({ value: editor.getValue() }));
});

stream.pipe(through(read));

function makeWidget(name, x) {
  var indent = globalIndent;
  var msg = document.createElement('div');
  msg.className = 'data';
  var pre = msg.appendChild(document.createElement('pre'));
  pre.onclick = function() {
    indent = !indent;
    fillPre();
  };
  function fillPre() {
    pre.innerHTML = JSON.stringify(JSON.parse(x), null, indent ? 2 : null);
  }
  fillPre();
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
    widgets = values(d).map(addWidget);
  }
}

function addWidget(val) {
  return editor.addLineWidget(
    val.line,
    makeWidget(val.name, val.stringified), {
      coverGutter: false,
      noHScroll: true
    });
}

function save() {
  stream.write(JSON.stringify({
    value: editor.getValue(),
    command: 'save'
  }));
  return false;
}

function values(d) {
  return Object.keys(d).map(function(k) { return d[k]; });
}
