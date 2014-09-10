/** @jsx React.DOM */

var Header = require('./components/header.jsx');
var Editor = require('./components/editor.jsx');
var Output = require('./components/output.jsx');

var App = React.createClass({
  getInitialState: function() {
    return {
        code: ''
    };
  },
  render: function() {
    return (
      <div>
        <Header />
        <Editor />
        <Output />
      </div>
    );
  }
});

React.renderComponent(
  <App />,
  document.getElementById('content')
);
