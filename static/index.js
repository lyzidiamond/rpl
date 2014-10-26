require('./css/css.js');

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
  writeJSON({ value: editor.getValue() });
});

stream.pipe(through(read));

function makeWidget(values) {
  var indent = globalIndent;
  var idx = 0;
  var msg = document.createElement('div');
  var pre = msg.appendChild(document.createElement('pre'));
  var n = msg.appendChild(document.createElement('div'));
  n.className = 'data-name';
  var name = n.appendChild(document.createElement('span'));
  name.className = 'data-var';
  name.innerHTML = values[idx].name;

  msg.className = 'data';

  pre.addEventListener('click', function() {
    indent = !indent;
    fillPre();
  });
  function fillPre(stringified) {
    pre.innerHTML = JSON.stringify(
        JSON.parse(stringified), null, indent ? 2 : null);
  }

  function setStep(_) {
    var value = values[_];
    fillPre(value.stringified);
    if (count) count.innerHTML = (_ + 1) + '/' + values.length;
    idx = _;
  }

  function nav(dir) {
    return function() {
      if (values[idx + dir]) setStep(idx + dir);
      return false;
    };
  }

  if (values.length > 1) {
    var timeControl = n.appendChild(document.createElement('span'));
    timeControl.className = 'time-control';
    var backward = timeControl.appendChild(document.createElement('a'));
    backward.innerHTML = '&larr;';
    backward.href = '#';
    var count = timeControl.appendChild(document.createElement('span'));
    var forward = timeControl.appendChild(document.createElement('a'));
    forward.innerHTML = '&rarr;';
    forward.href = '#';
    forward.addEventListener('click', nav(1));
    backward.addEventListener('click', nav(-1));
  }

  setStep(0);

  return msg;
}

function clearData() {
  widgets.forEach(editor.removeLineWidget);
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
  var line = val[val.length - 1].line;
  return editor.addLineWidget(
    line,
    makeWidget(val), {
      coverGutter: false,
      noHScroll: true
    });
}

function save() {
  writeJSON({ value: editor.getValue(), command: 'save' });
  return false;
}

function writeJSON(d) { stream.write(JSON.stringify(d)); }

function values(d) {
  return Object.keys(d).map(function(k) { return d[k]; });
}
