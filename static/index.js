require('./css/css.js');

var Combine = require('stream-combiner');
var through = require('through');
var shoe = require('shoe');
var Rickshaw = require('rickshaw');
var isGeoJSON = require('is-geojson');
var terrariumStream = require('terrarium-stream').Browser;
var streams = require('../shared/streams.js');
function $(_) { return document.getElementById(_); }
function ce(_, c) {
    var elem = document.createElement(_);
    elem.className = c || '';
    return elem;
}
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
  var idx = 0;
  var value;
  var parsed;
  var count;
  var mode = 'json';

  var msg = ce('div');
  var pre = msg.appendChild(ce('pre'));
  var n = msg.appendChild(ce('div', 'data-name'));
  n.className = 'data-name';
  var preTime = n.appendChild(ce('code', 'time'));
  var name = n.appendChild(ce('span', 'data-var'));
  name.innerHTML = values[idx].name;
  var select = n.appendChild(ce('select'));
  ['json', 'chart', 'map'].forEach(function(type) {
      var opt = select.appendChild(ce('option'));
      opt.value = opt.innerHTML = type;
  });
  select.onchange = function(e) {
    mode = e.target.value;
    fillPre();
  };

  msg.className = 'data';

  function fillPre() {
    try {
      parsed = value.val !== undefined ? value.val : value.stringified;

      if (parsed.ELEMENT_NODE && parsed.parentNode !== pre) {
        widgetTypes.element(pre, parsed);
      } else if (mode === 'json') {
        widgetTypes.json(pre, parsed);
      } else if (mode === 'chart') {
        widgetTypes.chart(pre, parsed);
      } else if (mode === 'map') {
        widgetTypes.map(pre, parsed);
      }

      if (value.when > 0) {
        preTime.innerHTML = value.when + 'ms';
      } else {
        preTime.innerHTML = '';
      }
    } catch(e) { }
  }

  function setStep(_) {
    _ = Math.min(values.length - 1, Math.max(0, _));
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

  function showNav() {
    if (values.length > 1) {
      if (n.getElementsByClassName('time-control').length) {
        n.getElementsByClassName('time-control')[0].parentNode.removeChild(n.getElementsByClassName('time-control')[0]);
      }
      var timeControl = n.appendChild(ce('span', 'time-control'));
      timeControl.className = 'time-control';
      var backward = timeControl.appendChild(ce('a'));
      backward.innerHTML = '&larr;';
      backward.href = '#';
      count = timeControl.appendChild(ce('span'));
      var forward = timeControl.appendChild(ce('a'));
      forward.innerHTML = '&rarr;';
      forward.href = '#';
      forward.addEventListener('click', nav(1));
      backward.addEventListener('click', nav(-1));
    }
  }

  showNav();
  setStep(0);

  return {
    element: msg,
    update: function(_) {
      values = _;
      showNav();
      fillPre();
      setStep(idx);
    }
  };
}

var widgetTypes = {
  json: function(container, value) {
    var element = container.firstChild;

    if (element && element.mode !== 'json')  container.innerHTML = '';

    if (element && element.mode == 'json') {
      update();
    } else {
      setup(); update();
    }

    function setup() {
      element = container.appendChild(ce('pre'));
      element.mode = 'json';
    }
    function update() {
      element.innerHTML = JSON.stringify(value, null, 2);
    }
  },
  element: function(container, value) {
    container.appendChild(value);
  },
  map: function(container, value) {
    var div = container.appendChild(document.createElement('div'));
    div.style.height = '300px';
    var features = L.mapbox.featureLayer(value);
    var map = L.mapbox.map(div, 'tmcw.map-7s15q36b')
      .addLayer(features);
    map.fitBounds(features.getBounds());
  },
  chart: function(container, value) {
    var element = container.firstChild;

    if (element && element.mode !== 'chart')  container.innerHTML = '';

    if (element && element.mode == 'chart') {
      update();
    } else {
      setup();
      update();
    }

    function setup() {
      element = container.appendChild(document.createElement('div'));
      element.chart = new Rickshaw.Graph({
        element: element,
        width: 960,
        height: 300,
        renderer: 'line',
        series: [{
          color: "#fff",
          data: value.map(function(d, i) {
            return { x: i, y: d };
          }),
          name: 'variable'
        }]
      });
      var hoverDetail = new Rickshaw.Graph.HoverDetail({
        graph: element.chart
      });
      element.chart.render();
      element.mode = 'chart';
    }

    function update() {
      element.chart.series[0].data = value.map(function(d, i) {
        return { x: i, y: d };
      });
      element.chart.update();
    }
  }
};

function joinWidgets(newData) {

  // remove old widgets
  widgets = widgets.filter(function(widget) {
    if (!newData[widget.id]) {
      editor.removeLineWidget(widget);
      return false;
    } else {
      return true;
    }
  });

  var widgetsById = widgets.reduce(function(memo, w) {
    memo[w.id] = w;
    return memo;
  }, {});

  for (var id in newData) {
    if (widgetsById[id]) {
      // update existing widgets
      widgetsById[id].update(newData[id]);
    } else {
      // create new widgets
      widgets.push(addWidget(newData[id], id));
    }
  }

  function addWidget(val, id) {
    var line = val[val.length - 1].line;
    var w = makeWidget(val);
    var widget = editor.addLineWidget(
      line,
      w.element, {
        coverGutter: false,
        noHScroll: true
      });
    widget.id = id;
    widget.update = w.update;
    return widget;
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
    joinWidgets(d);
  }
}

function onerr(str) {
  error.style.display = 'block';
  error.innerHTML = str;
  delayedClear = setTimeout(joinWidgets, 1000);
}

function values(d) { return Object.keys(d).map(function(k) { return d[k]; }); }
