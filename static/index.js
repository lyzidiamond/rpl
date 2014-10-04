var through = require('through');
var shoe = require('shoe');
var CodeMirror = require('codemirror');
require('./js/javascript')(CodeMirror);

var stream = shoe('/eval');

var error = document.getElementById('error');

function makeWidget(name, x) {
  var indent = false;
  var msg = document.createElement("div");
  msg.className = 'data';
  var pre = msg.appendChild(document.createElement("pre"));
  pre.appendChild(document.createTextNode(x));
  pre.onclick = function() {
    indent = !indent;
    pre.innerHTML = JSON.stringify(JSON.parse(x), null, indent ? 2 : null);
  };
  var n = msg.appendChild(document.createElement("div"));
  n.className = 'data-name';
  n.innerHTML = name;
  return msg;
}

var widgets = [];

function read(str) {
  var d = JSON.parse(str);
  widgets.forEach(function(w) {
    editor.removeLineWidget(w);
  });
  widgets = [];
  error.style.display = 'none';
  if (d.error) {
    error.style.display = 'block';
    error.innerHTML = d.error;
  } else if (d.defaultValue) {
    console.log(d);
    editor.setValue(d.defaultValue);
  } else {
    widgets = d.map(function(val) {
      return editor.addLineWidget(
        val.line,
        makeWidget(val.name, val.stringified), {
          coverGutter: false,
          noHScroll: true
        });
    });
  }
}

var editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
  indentUnit: 2,
  mode: 'text/javascript',
  lineNumbers: true,
  autofocus: true
});

editor.on('change', function() {
  stream.write(editor.getValue());
});

stream.pipe(through(read));
