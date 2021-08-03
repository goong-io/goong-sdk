'use strict';

var v = require('./service-helpers/validator');
var createServiceFactory = require('./service-helpers/create-service-factory');

/**
 * Map Matching API service.
 *
 * Learn more about this service and its responses in
 * [Goong Distance Matrix API documentation](https://docs.goong.io/rest/distance_matrix/).
 */
var DistanceMatrix = {};

/**
 * Get a duration and/or distance matrix showing travel times and distances between coordinates.
 *
 * @param {Object} config
 * @param {number} config.origins - Origin coordinate: `latitude,longitude|latitude,longitude`
 * @param {string} config.destinations - List of destination coordinate: `latitude,longitude|latitude,longitude|latitude,longitude`
 * @param {'car'|'bike'|'taxi'|'hd'} [config.vehicle='car'] - Vehicle type
 * @return {GAPIRequest}
 *
 * @example
 * matrixClient.getMatrix({
 *   origins: '20.981971,105.864323',
 *   destinations: '21.031011,105.783206|21.022328,105.790480|21.016665,105.788774',
 *   vehicle: 'car'
 * })
 *   .send()
 *   .then(response => {
 *       const matrix = response.body;
 *   });
 */
DistanceMatrix.getMatrix = function(config) {
  v.assertShape({
    origins: v.required(v.string),
    destinations: v.required(v.string),
    vehicle: v.oneOf('car', 'bike', 'taxi', 'truct', 'hd'),
    type: v.oneOf('fastest', 'shortest')
  })(config);

  return this.client.createRequest({
    method: 'GET',
    path: '/DistanceMatrix',
    query: config
  });
};

module.exports = createServiceFactory(DistanceMatrix);
