'use strict';

var v = require('./service-helpers/validator');
var createServiceFactory = require('./service-helpers/create-service-factory');
var stringifyBooleans = require('./service-helpers/stringify-booleans');

/**
 * Autocomplete API service.
 *
 * Learn more about this service and its responses in
 * [Goong Places API documentation](https://docs.goong.io/rest/place/).
 */
var Autocomplete = {};

/**
 * Autocomplete search
 *
 * See the [public documentation](https://docs.goong.io/rest/place/#places-search-by-keyword-with-autocomplete).
 *
 * @param {Object} config
 * @param {string} config.input - A place name.
 * @param {string} config.location -  A location to use as a hint when looking up the specified address - `latitude,longitude`
 * @param {number} config.radius -  Distance round from your location by kilometers
 * @param {number} [config.limit=10] - Limit the number of results returned.
 *  Options are [IETF language tags](https://en.wikipedia.org/wiki/IETF_language_tag) comprised of a mandatory
 *  [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) and optionally one or more IETF subtags for country or script.
 * @return {GAPIRequest}
 *
 * @example
 * autocompleteClient.search({
 *   input: 'san bay noi bai',
 *   limit: 5
 * })
 *   .send()
 *   .then(response => {
 *     const match = response.body;
 *   });
 *
 * @example
 * // autocomplete with location
 * autocompleteClient.search({
 *   input: 'san bay noi bai',
 *   location: '21.028531,105.854189',
 *   radius: 100
 * })
 *   .send()
 *   .then(response => {
 *     const match = response.body;
 *   });
 */
Autocomplete.search = function(config) {
  v.assertShape({
    input: v.required(v.string),
    location: v.string,
    radius: v.number,
    limit: v.number,
    session_token: v.string,
    sessiontoken: v.string,
    more_compound: v.boolean
  })(config);
  var query = stringifyBooleans(config);
  return this.client.createRequest({
    method: 'GET',
    path: '/place/autocomplete',
    query: query
  });
};

/**
 * Autocomplete get place detail
 *
 * See the [public documentation](https://docs.goong.io/rest/place/#get-place-detail-by-id).
 *
 * @param {Object} config
 * @param {string} config.placeID - Place id from `Autocomplete` or `Geocoding`.
 *  Options are [IETF language tags](https://en.wikipedia.org/wiki/IETF_language_tag) comprised of a mandatory
 *  [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) and optionally one or more IETF subtags for country or script.
 * @return {GAPIRequest}
 *
 * @example
 * autocompleteClient.placeDetail({
 *   placeid: '0WmA4vbeody2J9AEvVM9YE3ZN85z7Mrw',
 * })
 *   .send()
 *   .then(response => {
 *     const match = response.body;
 *   });
 */
Autocomplete.placeDetail = function(config) {
  v.assertShape({
    placeid: v.required(v.string),
    place_id: v.string
  })(config);

  return this.client.createRequest({
    method: 'GET',
    path: '/Place/Detail',
    query: config
  });
};

module.exports = createServiceFactory(Autocomplete);
