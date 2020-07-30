# CDS Extension for External Service Consumption

This node module provides an alternative solution for consuming external services in a Cloud Application Programming (CAP) Model where the users can use the raw capabilities of **axios** node module while still utilizing the following capabilites of CAP framework:
- Fluent api concept
- Handling of Destination and Connectivity configurations
- CDS configuration found in **package.json**

## Installation

Using npm:

```swift
> npm install cdse
```

## Example

```javascript
const cdse = require("cdse");

const service = await cdse.connect.to("NorthWind");

// HTTP GET
let result = await service.run({
	url: "/Products"
});

// HTTP POST
result = await service.run({
	url: "/Products",
	method: "post",
	data: {
		ID: 1234,
		ProductName: "Milk"
	}
});

// HTTP POST with X-CSRF-Token protection
result = await service.run({
	url: "/Products",
	method: "post",
	data: {
		ID: 1234,
		ProductName: "Milk"
	},
	csrfProtection: true
});
```