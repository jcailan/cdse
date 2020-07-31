/* eslint-disable no-console */
const cds = require("@sap/cds");
const axios = require("axios").default;
const { readDestination } = require("sap-cf-destconn");
const { readConnectivity } = require("./lib/connectivity");

function getConfigForTokenFetch(config) {
	let tokenConfig = {
		baseURL: config.baseURL,
		method: "HEAD",
		headers: Object.assign(config.headers || {}, {
			"x-csrf-token": "Fetch",
			"Connection": "keep-alive"
		}),
		auth: Object.assign({}, config.auth)
	};

	if (config.proxy) {
		tokenConfig.proxy = Object.assign({}, config.proxy);
	}

	if (process.env.DEBUG === "true") {
		console.log(tokenConfig);
	}

	return tokenConfig;
}

function getAxiosConfig(options, destination, connectivity) {
	return new Promise((resolve, reject) => {
		const config = Object.assign({}, options);
		config.baseURL = destination.URL || destination.url;
		config.auth = {
			username: destination.User || destination.username,
			password: destination.Password || destination.password
		};

		if (connectivity) {
			config.proxy = connectivity.proxy;
			config.headers = Object.assign(config.headers || {}, connectivity.headers);
		}

		if (!config.csrfProtection) {
			if (process.env.DEBUG === "true") {
				console.log(config);
			}
			resolve(config);
		} else {
			axios(getConfigForTokenFetch(config))
				.then(results => {
					const { headers } = results;
					config.headers = config.headers || {};
					config.headers["x-csrf-token"] = headers["x-csrf-token"];

					const cookies = headers["set-cookie"];
					if (cookies) {
						config.headers.Cookie = cookies.join("; ");
					}

					if (process.env.DEBUG === "true") {
						console.log(config);
					}
					resolve(config);
				})
				.catch(reject);
		}
	});
}

class Destination {
	constructor (credentials) {
		if (credentials.url === undefined && credentials.Authentication !== "NoAuthentication" && credentials.Authentication !== "BasicAuthentication") {
			throw new Error(`CDSE: Authentication Type ${credentials.Authentication} is not supported!`);
		}
		this.credentials = credentials;
	}

	run(options) {
		return new Promise((resolve, reject) => {
			const locationId = (this.credentials.CloudConnectorLocationId) ? this.credentials.CloudConnectorLocationId : null;

			switch (this.credentials.ProxyType) {
				case "OnPremise":
					readConnectivity(locationId)
						.then(connectivityConfig => {
							return getAxiosConfig(options, this.credentials, connectivityConfig);
						})
						.then(axiosConfig => {
							return axios(axiosConfig);
						})
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
					break;

				case undefined:
				case "Internet":
					getAxiosConfig(options, this.credentials)
						.then(axiosConfig => {
							return axios(axiosConfig);
						})
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
					break;

				default:
					throw new Error(`CDSE: Proxy Type ${this.credentials.ProxyType} is not supported!`);
			}
		});
	}
}

function to(destination) {
	return new Promise((resolve, reject) => {
		const config = cds.env.requires[destination];
		if (!config) {
			reject(new Error(`CDSE: Missing destination configuration for ${destination}!`));
		}

		if (!config.credentials) {
			reject(new Error("CDSE: External service configuration without credentials is not supported!"));
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
			reject(new Error(`CDSE: Missing credentials configuration for destination ${destination}`));
		}
	});
}

module.exports = {
	connect: {
		to: to
	}
};