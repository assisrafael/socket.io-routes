'use strict';

const validator = require('validator');
const _ = require('lodash');

module.exports = function setupSocketRoute(socket, next) {
	socket.route = function(routePath) {
		let validate = () => true;
		let authenticate = () => true;

		return {
			auth(options) {
				authenticate = () => {
					return _.every(options, (expectedValue, attr) => {
						return _.isEqual(socket.auth[attr], expectedValue);
					});
				};

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
					if (!authenticate()) {
						let err = new Error('Not authorized');
						return fn ? fn(err) : socket.emit('error', err);
					}

					let validationReturn = validate(data);
					if (!validationReturn || typeof validationReturn === 'object') {
						let err = validationReturn;
						return fn ? fn(err) : socket.emit('error', err);
					}

					(new Promise((resolve) => {
						let r = workFn(data);
						resolve(r);
					}))
					.then((returnValue) => {
						if (typeof fn !== 'undefined') {
							fn(null, returnValue);
						}
					}, (err) => {
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