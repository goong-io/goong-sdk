'use strict';

var node = require('./node-layer');
var GAPIClient = require('../classes/gapi-client');

function NodeClient(options) {
  GAPIClient.call(this, options);
}
NodeClient.prototype = Object.create(GAPIClient.prototype);
NodeClient.prototype.constructor = NodeClient;

NodeClient.prototype.sendRequest = node.nodeSend;
NodeClient.prototype.abortRequest = node.nodeAbort;

/**
 * Create a client for Node.
 *
 * @param {Object} options
 * @param {string} options.accessToken
 * @param {string} [options.origin]
 * @returns {GAPIClient}
 */
function createNodeClient(options) {
  return new NodeClient(options);
}

module.exports = createNodeClient;
