/* eslint-disable no-console */
const cds = require("@sap/cds");
const axios = require("axios").default;
const { readDestination } = require("sap-cf-destconn");
const { readConnectivity } = require("./lib/connectivity");

function getAxiosConfig(options, destination, connectivity) {
	const config = Object.assign({}, options);
	config.baseURL = destination.URL || destination.url;
	config.auth = {
		username: destination.User || destination.username,
		password: destination.Password || destination.password
	};

	if (connectivity) {
		config.proxy = connectivity.proxy;
		config.headers = {
			"Proxy-Authorization": connectivity.headers["Proxy-Authorization"]
		};
	}

	if (process.env.DEBUG === "true") {
		console.log(config);
	}
	return config;
}

class Destination {
	constructor (credentials) {
		this.credentials = credentials;
	}

	run(options) {
		return new Promise((resolve, reject) => {
			if (this.credentials.ProxyType === "OnPremise") {
				readConnectivity()
					.then(connectivityConfig => {
						axios(getAxiosConfig(options, this.credentials, connectivityConfig))
							.then(results => {
								if (process.env.DEBUG === "true") {
									console.log(results.data);
								}
								resolve(results.data);
							})
							.catch(error => {
								if (process.env.DEBUG === "true") {
									console.error(error.message);
									console.error(error.response.data);
								}
								reject(error);
							});
					})
					.catch(error => {
						reject(error);
					});
			} else {
				axios(getAxiosConfig(options, this.credentials))
					.then(results => {
						if (process.env.DEBUG === "true") {
							console.log(results.data);
						}
						resolve(results.data);
					})
					.catch(error => {
						if (process.env.DEBUG === "true") {
							console.error(error.message);
							console.error(error.response.data);
						}
						reject(error);
					});
			}
		});
	}
}

function to(destination) {
	return new Promise((resolve, reject) => {
		const config = cds.env.requires[destination];
		if (!config) {
			reject(new Error(`Missing destination configuration for ${destination}`));
		}

		if (!config.credentials) {
			resolve();
		}

		if (config.credentials.destination) {
			readDestination(config.credentials.destination)
				.then(credentials => {
					resolve(new Destination(credentials.destinationConfiguration));
				})
				.catch(reject);
		} else if (config.credentials.url) {
			resolve(new Destination(config.credentials));
		} else {
			reject(new Error(`Missing credentials configuration for destination ${destination}`));
		}
	});
}

module.exports = {
	connect: {
		to: to
	}
};