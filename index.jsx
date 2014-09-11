/** @jsx React.DOM */

var Header = require('./components/header.jsx');
var Editor = require('./components/editor.jsx');
var Output = require('./components/output.jsx');
var Scope = require('./components/scope.jsx');
var incrementalEval = require('incremental-eval');
var debounce = require('debounce');

var App = React.createClass({
  getInitialState: function() {
    return {
        code: ''
    };
  },
  _onChange: debounce(function(val) {
    this.setState({ code: val });
  }),
  render: function() {
    var values = incrementalEval(this.state.code);
    return (
      <div>
        <Header />
        <div className='page'>
            <Editor onChange={this._onChange} />
            <Output values={values} />
            <Scope values={values} />
        </div>
      </div>
    );
  }
});

React.renderComponent(
  <App />,
  document.getElementById('content')
);
