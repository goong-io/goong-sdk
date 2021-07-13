'use strict';

var v = require('./service-helpers/validator');
var createServiceFactory = require('./service-helpers/create-service-factory');

/**
 * Geocoding API service.
 *
 * Learn more about this service and its responses in
 * [Goong Geocoding API documentation](https://docs.goong.io/rest/geocode).
 */
var Geocoding = {};

/**
 * Reverse Geocoding
 *
 * @param {Object} config
 * @param {string} config.latlng - Coordinates at which features will be reversed.
 * @return {GAPIRequest}
 *
 * @example
 * geocodingClient.reverseGeocode({
 *   latlng: '21.0137443130001,105.798346108'
 * })
 *   .send()
 *   .then(response => {
 *     // JSON document with geocoding matches
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

/**
 * Forward Geocoding
 *
 * @param {Object} config
 * @param {string} config.address - Address string you are looking for
 * @return {GAPIRequest}
 *
 * @example
 * geocodingClient.forwardGeocode({
 *   address: '91 Trung Kinh, Trung Hoa, Cau Giay, Ha Noi'
 * })
 *   .send()
 *   .then(response => {
 *     // JSON document with geocoding matches
 *     const match = response.body;
 *   });
 */
Geocoding.forwardGeocode = function(config) {
  v.assertShape({
    address: v.required(v.string)
  })(config);

  return this.client.createRequest({
    method: 'GET',
    path: '/Geocode',
    query: config
  });
};

/**
 * Get Place detail
 *
 * @param {Object} config
 * @param {string} config.place_id - Place ID string
 * @return {GAPIRequest}
 *
 * @example
 * geocodingClient.placeDetail({
 *   place_id: 'uq58Yr/RA0wuHVtqzDczw7bbR4Gs7gs2b5DRZtogUr2bvWTaN5Vb2qd/atCZ1FoPg7cdIqFo9E_2TxQzrc20hw==.ZXhwYW5kMA=='
 * })
 *   .send()
 *   .then(response => {
 *     // JSON document with geocoding matches
 *     const match = response.body;
 *   });
 */
Geocoding.placeDetail = function(config) {
  v.assertShape({
    address: v.required(v.string)
  })(config);

  return this.client.createRequest({
    method: 'GET',
    path: '/Geocode',
    query: config
  });
};

module.exports = createServiceFactory(Geocoding);
