![rpl](images/logo.png)

`rpl` for the future and past. An alternative to the `node` default
REPL (what you access when you just call `node` and can type in lines of code).

## Install

    npm install -g rpl

The main trick is that this supports time travel. You can instrument code
calls by using special comments, and edit previous code, changing future values.

![](images/apples.gif)

It also supports async instrumentation, since node is node.

![](images/fs.gif)

```js
require('fs').readFile('/etc/hosts', 'utf8', function(err, res) {
  //=res
});
```

## hack on a blank page

    rpl && open http://localhost:3000/

## hack on file

    rpl foo.js && open http://localhost:3000/

## see also

`rpl` is the sibling of [mistakes.io](http://mistakes.io/), something
that does something similar but in browsers instead of node and implicitly
instead of explicitly.
