var CodeMirror = require('codemirror');
require('../js/javascript')(CodeMirror);

module.exports = React.createClass({
  render: function() {
    return (
      <div className='editor'>
          <textarea ref='editarea'></textarea>
      </div>
    );
  },
  _update: function(e) {
    this.props.onChange(e.getValue());
  },
  componentDidMount: function () {
    var editor = CodeMirror.fromTextArea(this.refs.editarea.getDOMNode(), {
      indentUnit: 2,
      mode: 'text/javascript',
      autofocus: true
    });
    editor.on('change', this._update);
  }
});
