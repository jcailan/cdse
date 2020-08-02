const _ = require("lodash");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const assert = require("assert").strict;
const mock = new MockAdapter(axios);
const Destination = require("../src/Destination");

describe("Class Destination", () => {
	let config = require("./data/Config.json");
	let service = new Destination(config);

	describe("execute run method with GET request (not authenticated)", () => {
		it("+ should return sales order data", (done) => {
			const url = "/SalesOrderSet('0500000000')?$format=json";
			mock.onGet(url)
				.replyOnce(200, require("./data/SalesOrder-GET-200"));

			service.run({
				url: url
			}).then(data => {
				assert.equal(data.d.SalesOrderID, "0500000000");
				done();
			}).catch(error => {
				done(error);
			});
		});

		it("- should not return sales order data", (done) => {
			const url = "/SalesOrderSet('1500000000')?$format=json";
			mock.onGet(url)
				.replyOnce(400, require("./data/SalesOrder-GET-400"));

			service.run({
				url: url
			}).then(data => {
				done(data);
			}).catch(error => {
				assert.equal(error.response.data.error.message.value, "Sales Order with key '1500000000' does not exist");
				done();
			});
		});
	});

	config = require("./data/ConfigWithAuth.json");
	service = new Destination(config);

	// Check that there is auth in here, otherwise pass through
	const checkRequest = (...data) => option => {
		if (option.auth.username !== config.username || option.auth.password !== config.password) {
			return [401];
		}

		if (option.method === "post") {
			const actualData = JSON.parse(option.data);
			const expectedData = data[3];
			if (!_.isEqual(actualData, expectedData)) {
				return [400];
			}
		}

		if (option.csrfProtection) {
			const actualData = option.headers;
			const expectedData = data[4];
			let isForbidden = false;
			Object.keys(expectedData).forEach(key => {
				if (expectedData[key] !== actualData[key]) {
					isForbidden = true;
				}
			});

			if (isForbidden) {
				return [403];
			}
		}

		return typeof data[0] === "function" ? data[0](option) : data;
	};

	describe("execute run method with GET request (authenticated)", () => {
		it("+ should return sales order data", (done) => {
			const url = "/SalesOrderSet('0500000000')?$format=json";
			mock.onGet(url)
				.replyOnce(checkRequest(200, require("./data/SalesOrder-GET-200")));

			service.run({
				url: url
			}).then(data => {
				assert.equal(data.d.SalesOrderID, "0500000000");
				done();
			}).catch(error => {
				done(error);
			});
		});

		it("- should not return sales order data", (done) => {
			const url = "/SalesOrderSet('1500000000')?$format=json";
			mock.onGet(url)
				.replyOnce(checkRequest(400, require("./data/SalesOrder-GET-400")));

			service.run({
				url: url
			}).then(data => {
				done(data);
			}).catch(error => {
				assert.equal(error.response.data.error.message.value, "Sales Order with key '1500000000' does not exist");
				done();
			});
		});
	});

	describe("execute run method with POST request (authenticated)", () => {
		it("+ should return created sales order data", (done) => {
			const url = "/SalesOrderSet('0500000000')?$format=json";
			mock.onPost(url)
				.replyOnce(checkRequest(201, require("./data/SalesOrder-POST-201.json"), null, require("./data/SalesOrder-POST-data.json")));

			service.run({
				url: url,
				method: "post",
				data: require("./data/SalesOrder-POST-data.json")
			}).then(data => {
				assert.equal(data.d.SalesOrderID, "0500000035");
				done();
			}).catch(error => {
				done(error);
			});
		});

		it("- should not create sales order data", (done) => {
			const url = "/SalesOrderSet('1500000000')?$format=json";
			mock.onPost(url)
				.replyOnce(checkRequest(400, null, require("./data/SalesOrder-POST-data-error.json")));

			service.run({
				url: url,
				method: "post",
				data: require("./data/SalesOrder-POST-data-error.json")
			}).then(data => {
				done(data);
			}).catch(() => {
				done();
			});
		});
	});

	describe("execute run method with POST request (authenticated + csrf token)", () => {
		it("+ should return created sales order data", (done) => {
			const url = "/SalesOrderSet('0500000000')?$format=json";
			mock.onHead("/$metadata")
				.replyOnce(200, null, require("./data/CSRF-response.json"));
			mock.onPost(url)
				.replyOnce(checkRequest(201, require("./data/SalesOrder-POST-201.json"), null, require("./data/SalesOrder-POST-data.json"), require("./data/CSRF-request.json")));

			service.run({
				url: url,
				method: "post",
				data: require("./data/SalesOrder-POST-data.json"),
				csrfProtection: true
			}).then(data => {
				assert.equal(data.d.SalesOrderID, "0500000035");
				done();
			}).catch(error => {
				done(error);
			});
		});
	});
});