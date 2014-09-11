module.exports = React.createClass({
  render: function() {
    var lines = this.props.values.map(function(val) {
        var value = val.value;
        if (value === undefined) {
            value = ' ';
        } else {
            value = JSON.stringify(value);
        }
        return (
            <div className='line'>
                <pre>{value}</pre>
            </div>);
    });
    return (
      <div className='output CodeMirror'>
        {lines}
      </div>
    );
  }
});
