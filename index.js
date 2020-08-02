const cds = require("@sap/cds");
const { readDestination } = require("sap-cf-destconn");
const Destination = require("./src/Destination");

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