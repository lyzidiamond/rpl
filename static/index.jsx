/** @jsxReact.DOM */

var React = require('react');
var Editor = require('./components/editor.jsx');
var incrementalEval = require('incremental-eval');
var debounce = require('debounce');

var App = React.createClass({
  render: function() {
    return (
      <div>
        <div className='page'>
          <Editor />
        </div>
      </div>
    );
  }
});

React.renderComponent(
  <App />,
  document.getElementById('content')
);
