'use strict';

var browser = require('./browser-layer');
var GAPIClient = require('../classes/gapi-client');

function BrowserClient(options) {
  GAPIClient.call(this, options);
}
BrowserClient.prototype = Object.create(GAPIClient.prototype);
BrowserClient.prototype.constructor = BrowserClient;

BrowserClient.prototype.sendRequest = browser.browserSend;
BrowserClient.prototype.abortRequest = browser.browserAbort;

/**
 * Create a client for the browser.
 *
 * @param {Object} options
 * @param {string} options.accessToken
 * @param {string} [options.origin]
 * @returns {GAPIClient}
 */
function createBrowserClient(options) {
  return new BrowserClient(options);
}

module.exports = createBrowserClient;
