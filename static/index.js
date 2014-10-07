var through = require('through');
var shoe = require('shoe');
var CodeMirror = require('codemirror');
require('./js/javascript')(CodeMirror);
var fs = require('fs');
var _ = require('lodash');
var insertCss = require('insert-css');

insertCss(fs.readFileSync('./node_modules/codemirror/theme/monokai.css'));
insertCss(fs.readFileSync('./node_modules/codemirror/lib/codemirror.css'));
insertCss(fs.readFileSync(__dirname + '/css/site.css', 'utf8'));

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
  console.log(d);
  if (d.error) {
    error.style.display = 'block';
    error.innerHTML = d.error;
  } else if (d.defaultValue) {
    editor.setValue(d.defaultValue);
  } else {
    widgets = _.values(d).map(function(val) {
      console.log(arguments);
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

editor.setOption('theme', 'monokai');

editor.on('change', function() {
  stream.write(editor.getValue());
});

stream.pipe(through(read));
