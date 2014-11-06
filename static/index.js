require('./css/css.js');

var Combine = require('stream-combiner');
var through = require('through');
var shoe = require('shoe');
var Chart = require('chart.js/Chart.js');
var isGeoJSON = require('is-geojson');
var terrariumStream = require('terrarium-stream').Browser;
var streams = require('../shared/streams.js');
function $(_) { return document.getElementById(_); }
var error = $('error');
require('mapbox.js');

L.mapbox.accessToken = 'pk.eyJ1IjoidG1jdyIsImEiOiJIZmRUQjRBIn0.lRARalfaGHnPdRcc-7QZYQ';

var CodeMirror = require('codemirror');
require('./js/javascript')(CodeMirror);

var backends = {
  node: function() {
    return Combine(streams.toJSON(), shoe('/eval'), streams.fromJSON());
  },
  browser: function() { return terrariumStream(); }
};

var backend = null;
var backendType = null;
var widgets = [];

var evalPause = false, globalIndent = false, delayedClear = null;
$('evaluate').onchange = function(e) {  evalPause = !e.target.checked; };
$('indent').onchange = function(e) { globalIndent = !!e.target.checked; };
$('backend').onchange = function(e) { setBackend(e.target.value); };

var editor = CodeMirror.fromTextArea($('editor'), {
  indentUnit: 2,
  mode: 'text/javascript',
  lineNumbers: true,
  autofocus: true,
  extraKeys: {
    'Ctrl-S': save,
    'Cmd-S': save
  }
});

function save() {
  backend.write({ value: editor.getValue(), command: 'save' });
  return false;
}

editor.setOption('theme', 'vibrant-ink');

editor.on('change', function() {
  if (evalPause) return;
  clearTimeout(delayedClear);
  backend.write({ value: editor.getValue() });
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
  var parsed;
  var mode = 'json';

  var msg = document.createElement('div');
  var pre = msg.appendChild(document.createElement('pre'));
  var n = msg.appendChild(document.createElement('div'));
  n.className = 'data-name';
  var preTime = n.appendChild(document.createElement('code'));
  preTime.className = 'time';
  var name = n.appendChild(document.createElement('span'));
  name.className = 'data-var';
  name.innerHTML = values[idx].name;
  var select = n.appendChild(document.createElement('select'));
  ['json', 'chart', 'map'].forEach(function(type) {
      var opt = select.appendChild(document.createElement('option'));
      opt.value = opt.innerHTML = type;
  });
  select.onchange = function(e) {
    mode = e.target.value;
    fillPre();
  };

  msg.className = 'data';

  pre.addEventListener('click', function() {
    if (parsed.ELEMENT_NODE || mode !== 'json') return;
    indent = !indent;
    fillPre();
  });

  function fillPre() {
    try {
      parsed = value.val !== undefined ? value.val : value.stringified;
      if (parsed.ELEMENT_NODE && parsed.parentNode !== pre) {
      } else if (mode === 'json') {
      } else if (mode === 'chart') {
      } else if (mode === 'map') {
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

var widgetTypes = {
  json: function(value) {
    var element = container.firstChild;

    if (element && element.pre) {
      update();
    } else {
      setup();
      update();
    }

    function setup() {
      element = pre.appendChild(document.createElement('pre'));
      element.pre = true;
    }
    function update() {
      element.innerHTML = JSON.stringify(parsed, null, indent ? 2 : null);
    }
  },
  element: function(value) {
    pre.appendChild(parsed);
  },
  map: function(value) {
    var div = pre.appendChild(document.createElement('div'));
    div.style.height = '300px';
    var features = L.mapbox.featureLayer(parsed);
    var map = L.mapbox.map(div, 'tmcw.map-7s15q36b')
      .addLayer(features);
    map.fitBounds(features.getBounds());
  },
  chart: function(container, value) {
    var element = container.firstChild;

    if (element && element.chart) {
      update();
    } else {
      setup();
      update();
    }

    function setup() {
      element = pre.appendChild(document.createElement('canvas'));
      element.width = 800;
      element.height = 200;
      element.chart = new Chart(canvas.getContext('2d')).Line({
        labels: values.map(function(v, i) { return i; }),
        datasets: [{
          label: 'variable',
          bezierCurve: false,
          fillColor: 'rgba(220,220,220,0.2)',
          strokeColor: 'rgba(220,220,220,1)',
          pointColor: 'rgba(220,220,220,1)',
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: 'rgba(220,220,220,1)',
        }]
      });
    }

    function update() {
      element.chart.datasets[0].data = values.map(function(v) { return v.val; });
      element.chart.update();
    }
  }
};

function joinWidgets(data) {
  widgets.forEach(editor.removeLineWidget);
  widgets = [];
  data.forEach(addWidget);

  function addWidget(val) {
    var line = val[val.length - 1].line;
    return editor.addLineWidget(
      line,
      makeWidget(val), {
        coverGutter: false,
        noHScroll: true
      });
  }
}

function read(d) {
  if (evalPause) return;

  if (d.defaultValue) {
    editor.setValue(d.defaultValue);
    return;
  }

  clearTimeout(delayedClear);

  if (d.error) {
    error.style.display = 'block';
    error.innerHTML = d.error;
    delayedClear = setTimeout(joinWidgets, 1000);
  } else {
    error.style.display = 'none';
    joinWidgets(values(d));
  }
}

function onerr(str) {
  error.style.display = 'block';
  error.innerHTML = str;
  delayedClear = setTimeout(joinWidgets, 1000);
}

function values(d) { return Object.keys(d).map(function(k) { return d[k]; }); }
