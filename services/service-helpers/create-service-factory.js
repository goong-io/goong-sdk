'use strict';

var GAPIClient = require('../../lib/classes/gapi-client');
// This will create the environment-appropriate client.
var createClient = require('../../lib/client');

function createServiceFactory(ServicePrototype) {
  return function(clientOrConfig) {
    var client;
    if (GAPIClient.prototype.isPrototypeOf.call(clientOrConfig)) {
      client = clientOrConfig;
    } else {
      client = createClient(clientOrConfig);
    }
    var service = Object.create(ServicePrototype);
    service.client = client;
    return service;
  };
}

module.exports = createServiceFactory;
