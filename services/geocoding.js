'use strict';

var v = require('./service-helpers/validator');
var createServiceFactory = require('./service-helpers/create-service-factory');

/**
 * Geocoding API service.
 *
 * Learn more about this service and its responses in
 * [Goong REST API documentation](https://docs.goong.io/rest/guide#geocode).
 */
var Geocoding = {};

/**
 * Get Place by coordinate
 *
 * @param {Object} config
 * @param {string} config.latlng - Coordinates at which features will be reversed.
 * @return {GAPIRequest}
 *
 * @example
 * geocodingClient.reverseGeocode({
 *   latlng: '20.981971,105.864323'
 * })
 *   .send()
 *   .then(response => {
 *     // GeoJSON document with geocoding matches
 *     const match = response.body;
 *   });
 */
Geocoding.reverseGeocode = function(config) {
  v.assertShape({
    latlng: v.required(v.string)
  })(config);

  return this.client.createRequest({
    method: 'GET',
    path: '/Geocode',
    query: config
  });
};

module.exports = createServiceFactory(Geocoding);
