'use strict';

var v = require('./service-helpers/validator');
var stringifyBooleans = require('./service-helpers/stringify-booleans');
var createServiceFactory = require('./service-helpers/create-service-factory');

/**
 * Directions API service.
 *
 * Learn more about this service and its responses in
 * [Goong Directions API documentation](https://docs.goong.io/rest/directions).
 */
var Directions = {};

/**
 * Get directions.
 *
 * @param {Object} config
 * @param {number} config.origin - Origin coordinate `latitude,longitude`
 * @param {string} config.destination - The destination coordinate string. Split by `;` for more than 2 destinations.
 * @param {boolean} [config.alternatives=true] - Whether to try to return alternative routes.
 * @param {'car'|'bike'|'taxi'|'hd'} [config.vehicle='car'] - Vehicle type
 
 * @return {GAPIRequest}
 *
 * @example
 * directionsClient.getDirections({
 *   origin: '20.981971,105.864323',
 *   destination: '21.031011,105.783206',
 *   alternatives: true,
 *   vehicle: 'car'
 * })
 *   .send()
 *   .then(response => {
 *     const directions = response.body;
 *   });
 */
Directions.getDirections = function(config) {
  v.assertShape({
    origin: v.required(v.string),
    destination: v.required(v.string),
    vehicle: v.oneOf('car', 'bike', 'taxi', 'truct', 'hd'),
    type: v.oneOf('fastest', 'shortest'),
    alternatives: v.boolean
  })(config);
  var query = stringifyBooleans(config);
  return this.client.createRequest({
    method: 'GET',
    path: '/Direction',
    query: query
  });
};

module.exports = createServiceFactory(Directions);
