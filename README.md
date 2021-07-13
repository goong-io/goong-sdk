# @goongmaps/goong-sdk

[![npm](https://img.shields.io/npm/v/@goongmaps/goong-sdk.svg)](https://www.npmjs.com/package/@goongmaps/goong-sdk)

A Javascript SDK for working with [Goong REST APIs](https://docs.goong.io/rest/).

- [Directions API](https://docs.goong.io/rest/directions/)
- [Distance Matrix API](https://docs.goong.io/rest/distance_matrix/)
- [Geocoding API](https://docs.goong.io/rest/geocode/)
- [Place API](https://docs.goong.io/rest/place/)
- [Static Map API](https://docs.goong.io/rest/staticmap/)

Works in Node, the browser, and React Native.

## Table of contents

- [Installation](#installation)
  - [Npm](#npm)
  - [Yarn](#yarn)
- [Usage](#usage)
  - [Creating clients](#creating-clients)
  - [Creating and sending requests](#creating-and-sending-requests)
- [Services](#services)
- [Pre-bundled files on unpkg.com](#pre-bundled-files-on-unpkgcom)

## Installation

### Npm

```
npm install @goongmaps/goong-sdk
```

### Yarn

```
yarn add @gongmaps/goong-sdk
```

**If you are supporting older browsers, you will need a Promise polyfill.**
[es6-promise](https://github.com/stefanpenner/es6-promise) is a good one, if you're uncertain.

The documentation below assumes you're using a JS module system.
If you aren't, read ["Pre-bundled files on unpkg.com"](#pre-bundled-files-on-unpkgcom).

## Usage

There are 3 basic steps to getting an API response:

1. Create a client.
2. Create a request.
3. Send the request.

### Creating clients

To **create a service client**, import the service's factory function from `'@goongmaps/goong-sdk/services/{service}'` and provide it with your [access token](https://docs.goong.io/rest/api-key/).

The service client exposes methods that create requests.

```js
const gmsDirections = require('@goongmaps/goong-sdk/services/directions');
const directionService = gmsDirections({ accessToken: MY_ACCESS_TOKEN });
```

You can also **share one configuration between multiple services**.
To do that, initialize a base client and then pass *that* into service factory functions.

```js
const goongClient = require('@goongmaps/goong-sdk');
const goongDirections = require('@goongmaps/goong-sdk/services/directions');

const baseClient = goongClient({ accessToken: MY_ACCESS_TOKEN });
const directionService = goongStyles(baseClient);
```

### Creating and sending requests

To **create a request**, invoke a method on a service client.

Once you've created a request, **send the request** with its `send` method.
It will return a Promise that resolves with a `GAPIResponse`.

```js
const goongClient = require('@goongmaps/goong-sdk');
const goongDirections = require('@goongmaps/goong-sdk/services/directions');

const baseClient = goongClient({ accessToken: MY_ACCESS_TOKEN });
const directionService = goongDirections(baseClient);

directionService.getDirections({..})
  .send()
  .then(response => {..}, error => {..});
```

## Services

Please read [the full documentation for services](./docs/services.md).

## Pre-bundled files on unpkg.com

If you aren't using a JS module system, you can use a `<script>` tag referencing pre-bundled files on the CDN [unpkg.com](https://unpkg.com/).

```html
<script src="https://unpkg.com/@goongmaps/goong-sdk/umd/goong-sdk.js"></script>
<script src="https://unpkg.com/@goongmaps/goong-sdk/umd/goong-sdk.min.js"></script>
```

These files are a UMD build of the package, exposing a global `goongSdk` function that creates a client, initializes *all* the services, and attaches those services to the client.
Here's how you might use it.

```html
<script src="https://unpkg.com/@goongmaps/goong-sdk/umd/goong-sdk.min.js"></script>
<script>
  var goongClient = goongSdk({ accessToken: MY_ACCESS_TOKEN });
  goongClient.autocomplete.search(..)
    .send()
    .then(..);
</script>
```
