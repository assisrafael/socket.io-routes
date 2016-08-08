# socket.io-routes [![Build Status](https://travis-ci.org/assisrafael/socket.io-routes.svg?branch=master)](https://travis-ci.org/assisrafael/socket.io-routes) [![Coverage Status](https://coveralls.io/repos/github/assisrafael/socket.io-routes/badge.svg?branch=master)](https://coveralls.io/github/assisrafael/socket.io-routes?branch=master)

[![NPM](https://nodei.co/npm/socket.io-routes.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/socket.io-routes/)


An alternative API for writing socket.io event handlers

## How to use

```JavaScript
const io = require('socket.io');
const routes = require('socket.io-routes);
//...
io.use(routes);

io.on('connection', function(s) {
  s.route('event')
    .process(function(data) {
      s.emit('success', 'some data');
    });
});
```

Instead of sending manually a message, you can return a value to the callback of the event (if available):

```JavaScript
s.route('event')
  .process(function(data) {
    doSomething().then(() => {
      return doSomething();
    });
  });
```

You can add authentication (assumes an authentication middleware like the following):
```JavaScript
io.use(function authenticateMiddleware(s, next) {
  if (!s.auth) {
    s.auth = {};
  }

  if (s.handshake.query.token === 'secret') {
    s.auth.isAuthenticated = true;
  }

  next();
});
//...
s.route('event')
  .auth({
    isAuthenticated: true
  })
  .process(function(data) {
    return doSomething();
  });
```

And you can also validate data using [node-validator](https://github.com/chriso/validator.js):

```JavaScript
s.route('event')
  .validate({
    email: {
      isEmail: {},
      isLowercase: true
  })
  .process(function(data) {
    return doSomething();
  });
```
