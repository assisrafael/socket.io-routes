'use strict';

const validator = require('validator');
const _ = require('lodash');
const prettyHrtime = require('pretty-hrtime');

function getElapsedTime(start) {
	const end = process.hrtime(start);
	return prettyHrtime(end);
}

module.exports = function setupSocketRoute(socket, next) {
	socket.route = function(routePath) {
		let validate = () => true;
		let authenticate = () => true;
		let loggerFn = () => {};

		return {
			auth(options) {
				authenticate = () => {
					return _.every(options, (expectedValue, attr) => {
						return _.isEqual(socket.auth[attr], expectedValue);
					});
				};

				return this;
			},
			log(_loggerFn) {
				loggerFn = _loggerFn;

				return this;
			},
			validate(options) {
				validate = (data) => {
					return _.every(options, (validations, attr) => {
						let dataValue = data[attr];

						return _.every(validations, (validationOptions, validation) => {
							let validationFn = validator[validation];
							return validationFn(dataValue, validationOptions);
						});
					});
				};

				return this;
			},
			process(workFn) {
				socket.on(routePath, (data, fn) => {
					const start = process.hrtime();

					if (!authenticate()) {
						let err = new Error('Not authorized');
						loggerFn(routePath, data, err, getElapsedTime(start));
						return fn ? fn(err) : socket.emit('error', err);
					}

					let validationReturn = validate(data);
					if (!validationReturn || typeof validationReturn === 'object') {
						let err = validationReturn;
						loggerFn(routePath, data, err, getElapsedTime(start));
						return fn ? fn(err) : socket.emit('error', err);
					}

					(new Promise((resolve) => {
						let r = workFn(data);
						resolve(r);
					}))
					.then((returnValue) => {
						loggerFn(routePath, data, null, getElapsedTime(start));
						if (typeof fn !== 'undefined') {
							fn(null, returnValue);
						}
					}, (err) => {
						loggerFn(routePath, data, err, getElapsedTime(start));
						if (typeof fn !== 'undefined') {
							fn(err);
						}
					});
				});
			}
		};
	};

	next();
};