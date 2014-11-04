var fs = require('fs');
var insertCss = require('insert-css');
insertCss(fs.readFileSync(__dirname + '/vibrant-ink.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/codemirror.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/site.css', 'utf8'));
insertCss(fs.readFileSync(__dirname + '/../../node_modules/mapbox.js/theme/style.css', 'utf8'));
