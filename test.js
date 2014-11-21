var test = require('tape'),
  shoe = require('sockjs-stream'),
  RPL = require('./index.js');

test('rpl - listen & close', function(t) {
  var rpl = new RPL();
  rpl.listen(1984, function(err, res) {
    var stream = shoe('ws://localhost:1984/eval');
    stream.write(JSON.stringify({ value: '//=1' }));
    stream.on('data', function(data) {
      t.equal(JSON.parse(data)['1:0'][0].name, '1', 'response.name');
      rpl.close(function(err, res) {
        t.end();
      });
    });
  });
});
