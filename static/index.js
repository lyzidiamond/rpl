require('./css/css.js');

var through = require('through');
var shoe = require('shoe');
var terrariumStream = require('terrarium-stream');

var CodeMirror = require('codemirror');
require('./js/javascript')(CodeMirror);

var backends = {
  node: function() { return shoe('/eval'); },
  browser: function() { return terrariumStream(); }
};

var backend = null;
var backendType = null;

var error = document.getElementById('error');

var evalPause = false,
  globalIndent = false,
  widgets = [],
  delayedClear = null;

document.getElementById('evaluate').onchange = function(e) {
  evalPause = !e.target.checked;
};

document.getElementById('indent').onchange = function(e) {
  globalIndent = !!e.target.checked;
};

document.getElementById('backend').onchange = function(e) {
  setBackend(e.target.value);
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

setBackend('browser');

function setBackend(type) {
  if (backend) backend.destroy();
  backend = backends[type]();
  backend.pipe(through(read));
  backend.on('err', onerr);
  backendType = type;
}

function makeWidget(values) {
  var indent = globalIndent;
  var idx = 0;
  var value;
  var msg = document.createElement('div');
  var pre = msg.appendChild(document.createElement('pre'));
  var n = msg.appendChild(document.createElement('div'));
  n.className = 'data-name';
  var preTime = n.appendChild(document.createElement('code'));
  preTime.className = 'time';
  var name = n.appendChild(document.createElement('span'));
  name.className = 'data-var';
  name.innerHTML = values[idx].name;

  msg.className = 'data';

  pre.addEventListener('click', function() {
    if (parsed.ELEMENT_NODE) return;
    indent = !indent;
    fillPre();
  });
  function fillPre() {
    try {
      var parsed = value.val !== undefined ?
          value.val : value.stringified;
      if (parsed.ELEMENT_NODE && parsed.parentNode !== pre) {
        pre.appendChild(parsed);
      } else {
        pre.innerHTML = JSON.stringify(parsed, null, indent ? 2 : null);
      }
      if (value.when > 0) {
        preTime.innerHTML = value.when + 'ms';
      } else {
        preTime.innerHTML = '';
      }
    } catch(e) { }
  }

  function setStep(_) {
    value = values[_];
    fillPre();
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
  if (evalPause) return;
  var d = typeof str === 'string' ? JSON.parse(str) : str;

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

function onerr(str) {
  error.style.display = 'block';
  error.innerHTML = str;
  delayedClear = setTimeout(clearData, 1000);
}

function save() {
  writeJSON({ value: editor.getValue(), command: 'save' });
  return false;
}

function writeJSON(d) {
  if (backendType === 'node') {
    backend.write(JSON.stringify(d));
  } else {
    backend.write(d);
  }
}

function values(d) {
  return Object.keys(d).map(function(k) { return d[k]; });
}
