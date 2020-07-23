"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokens = {};
function getToken(key) {
	cleanCache();
	const cacheToken = tokens[key];
	if (cacheToken) {
		return cacheToken.value;
	}
}
exports.getToken = getToken;
function setToken(key, token) {
	cleanCache();
	if (token) {
		tokens[key] = {
			validUntil: new Date(new Date().getTime() + (token.expires_in * 1000)),
			value: token
		};
		return token;
	}
}
exports.setToken = setToken;
function cleanCache() {
	const now = new Date().getTime() - 1000;
	Object.entries(tokens).forEach(function([key, value]) {
		if (value.validUntil.getTime() < now) {
			delete tokens[key];
		}
	});
}
