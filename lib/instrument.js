module.exports = instrument;

// Given a string of source code, look for our magic kind of comment
// and transform those comments into actual code that records the value
// of variables at a point in time.
//
// The process is really similar to code instrumentation used for
// coverage testing - for instance, how istanbul and bunker go about
// their business. But this is only for when the user explicitly
// wants instrumentation, and it uses dumb string operations instead
// of a real parser or code rewriter.
function instrument(str, tick) {
  var TODO = {};
  var result = str.split('\n')
    // if a line has a magic comment, replace the comment with
    // instrumentation code
    .map(rewriteLine)
    // finally, hit it with a final update call. the way that we're working
    // here is async - _UPDATE() can be called later on by anything that
    // calls INSTRUMENT(), but we call it here just in case all code
    // is sync.
    .join('\n') + '\n;_UPDATE(' + tick + ');';

  function rewriteLine(line, i) {
    if (line.match(/\/\/=/)) {
      return line.replace(/(\/\/=)(.*)$/, rewriteComment(i));
    } else {
      return line;
    }
  }

  function rewriteComment(lineNumber) {
    return function(match, _, name, offset) {
      TODO[name + ':' + lineNumber] = false;
      // the function INSTRUMENT is implement above as a part of
      // the context given to vm.runInNewContext
      return ';INSTRUMENT.log(' +
          '"' + name + '"' +
          ',' +
          lineNumber + ',' + name + ');';
    };
  }

  return {
    result: result,
    TODO: TODO
  };
}
