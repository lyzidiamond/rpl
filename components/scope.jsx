var textTable = require('text-table');

module.exports = React.createClass({
  render: function() {
    var tabled = this.props.values.map(function(val) {
        if (val.scope) {
            return Object.keys(val.scope).map(function(s) {
                return [s, JSON.stringify(val.scope[s])];
            });
        } else {
            return [];
        }
    });
    var keys = [];
    tabled.forEach(function(s) {
        s.forEach(function(s) {
            if (keys.indexOf(s[0]) === -1) keys.push(s[0]);
        });
    });
    var rotated = [keys].concat(tabled.map(function(t) {
        return keys.map(function(k) {
            var v = t.filter(function(_) {
                return _[0] == k;
            });
            if (v.length) return v[0][1];
            else return '';
        });
    }));
    var rows = rotated.map(function(data) {
        return (
            <tr>
                <td>{data[0]}</td>
                <td>{data[1]}</td>
            </tr>);
    });
    return (
      <div className='scope CodeMirror'>
        <table>
            {rows}
        </table>
      </div>
    );
  }
});
