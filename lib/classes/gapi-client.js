'use strict';

var GAPIRequest = require('./gapi-request');
var constants = require('../constants');

/**
 * A low-level Goong API client. Use it to create service clients
 * that share the same configuration.
 *
 * Services and `GAPIRequest`s use the underlying `GAPIClient` to
 * determine how to create, send, and abort requests in a way
 * that is appropriate to the configuration and environment
 * (Node or the browser).
 *
 * @class GAPIClient
 * @property {string} accessToken - The Goong access token / api key assigned
 *   to this client.
 * @property {string} [origin] - The origin
 *   to use for API requests. Defaults to https://rsapi.goong.io
 */

function GAPIClient(options) {
  if (!options || !options.accessToken) {
    throw new Error('Cannot create a client without an API key');
  }

  this.accessToken = options.accessToken;
  this.origin = options.origin || constants.API_ORIGIN;
}

GAPIClient.prototype.createRequest = function createRequest(requestOptions) {
  return new GAPIRequest(this, requestOptions);
};

module.exports = GAPIClient;
