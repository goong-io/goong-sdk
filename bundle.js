'use strict';

var browserClient = require('./lib/browser/browser-client');
var gmsAutocomplete = require('./services/autocomplete');
var gmsDirections = require('./services/directions');
var gmsGeocoding = require('./services/geocoding');
var gmsDistanceMatrix = require('./services/distancematrix');
var gmsStatic = require('./services/static');

function goongSdk(options) {
  var client = browserClient(options);

  client.autocomplete = gmsAutocomplete(client);
  client.directions = gmsDirections(client);
  client.geocoding = gmsGeocoding(client);
  client.distancematrix = gmsDistanceMatrix(client);
  client.static = gmsStatic(client);

  return client;
}

module.exports = goongSdk;
