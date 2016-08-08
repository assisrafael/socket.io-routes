'use strict';

import test from 'ava';
import routes from './routes';
import io from 'socket.io';
import ioc from 'socket.io-client';
import {Server as http}  from 'http';

function client(srv, nsp, opts){
	if ('object' == typeof nsp) {
		opts = nsp;
		nsp = null;
	}
	var addr = srv.address();
	if (!addr) addr = srv.listen().address();
	var url = 'ws://localhost:' + addr.port + (nsp || '');
	return ioc(url, opts);
}

function authenticateMiddleware(s, next) {
	if (!s.auth) {
		s.auth = {};
	}

	if (s.handshake.query.token === 'secret') {
		s.auth.isAuthenticated = true;
	}

	next();
}

test('should export a function', t => {
	t.is(typeof routes, 'function');
});


test.cb('should check if it will generate a collision with a builtin name', t => {
	t.plan(1);
	let srv = http();
	let sio = io(srv);

	srv.listen(() => {
		let socket = client(srv);
		sio.on('connection', function(s) {
			t.is(typeof s.route, 'undefined');
			t.end();
		});
	});
});

test.cb('should define a new function into socket', t => {
	t.plan(1);
	let srv = http();
	let sio = io(srv);

	sio.use(routes);

	srv.listen(() => {
		let sioc = client(srv);
		sio.on('connection', function(s) {
			t.is(typeof s.route, 'function');
			t.end();
		});
	});
});

test.cb('should handle an event', t => {
	t.plan(2);
	let srv = http();
	let sio = io(srv);

	sio.use(routes);

	srv.listen(() => {
		let sioc = client(srv);
		sio.on('connection', function(s) {
			s.route('msg')
				.process(function(data) {
					t.is(data, 'message');
					s.emit('success', 'success');
				});
		});

		sioc.on('success', function(msg) {
			t.is(msg, 'success');
			t.end();
		});

		sioc.emit('msg', 'message');
	});
});

test.cb('should handle an event with a callback', t => {
	t.plan(3);
	let srv = http();
	let sio = io(srv);

	sio.use(routes);

	srv.listen(() => {
		let sioc = client(srv);
		sio.on('connection', function(s) {
			s.route('msg')
				.process(function(data) {
					t.is(data, 'message');
					return 'success';
				});
		});

		sioc.emit('msg', 'message', function(err, msg) {
			t.ifError(err, 'should not raise an error');
			t.is(msg, 'success');
			t.end();
		});
	});
});

test.cb('should validate client authentication', t => {
	t.plan(2);
	let srv = http();
	let sio = io(srv);

	sio.use(routes);
	sio.use(authenticateMiddleware);

	srv.listen(() => {
		let sioc = client(srv, {
			query: {
				token: 'secret'
			}
		});

		sio.on('connection', function(s) {
			s.on('error', function(err) {
				t.fail();
				t.end();
			});

			s.route('msg')
				.auth({
					isAuthenticated: true
				})
				.process(function(data) {
					t.is(data, 'message');
					s.emit('success', 'success');
				});
		});

		sioc.on('success', function(msg) {
			t.is(msg, 'success');
			t.end();
		});

		sioc.emit('msg', 'message');
	});
});

test.cb('should raise an error when authentication fail', t => {
	t.plan(1);
	let srv = http();
	let sio = io(srv);

	sio.use(routes);
	sio.use(authenticateMiddleware);

	srv.listen(() => {
		let sioc = client(srv, {
			query: {
				token: '123456'
			}
		});

		sio.on('connection', function(s) {
			s.on('error', function(err) {
				t.pass();
				t.end();
			});

			s.route('msg')
				.auth({
					isAuthenticated: true
				})
				.process(function(data) {
					t.fail();
				});
		});

		sioc.emit('msg', 'message');
	});
});
