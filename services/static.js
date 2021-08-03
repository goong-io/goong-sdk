'use strict';
var v = require('./service-helpers/validator');
var createServiceFactory = require('./service-helpers/create-service-factory');

/**
 * Static Images API service.
 *
 * Learn more about this service and its responses in
 * [Goong Static Map API documentation](https://docs.goong.io/rest/staticmap/).
 */
var Static = {};

/**
 * Get a static map image.
 *
 * @param {Object} config
 * @param {number} config.origin - Origin coordinate `latitude,longitude`
 * @param {string} config.destination - Destination coordinate `latitude,longitude`
 * @param {number} [config.width=600] - Width of the image in pixels, default 600px.
 * @param {number} [config.height=400] - Height of the image in pixels, default 400px.
 * @param {'car'|'bike'|'taxi'} [config.vehicle='car'] - Vehicle type
 * @param {'fastest'|'shortest'} [config.type='fastest'] - Routing type
 * @param {string} [config.color='#253494'] - Color of route line, default #253494
 *
 * @return {GAPIRequest}
 *
 * @example
 * staticClient.getStaticImage({
 *   origin: '20.981971,105.864323',
 *   destination: '20.994531,105.849663',
 *   width: 600,
 *   height: 400,
 *   vehicle: 'car',
 *   type: 'fastest',
 *   color: '#253494'
 *
 * })
 *   .send()
 *   .then(response => {
 *     const image = response.body;
 *   });
 *
 */
Static.getStaticImage = function(config) {
  v.assertShape({
    origin: v.required(v.string),
    destination: v.required(v.string),
    width: v.number,
    height: v.number,
    vehicle: v.oneOf('car', 'bike', 'taxi', 'truct', 'hd'),
    type: v.oneOf('fastest', 'shortest'),
    color: v.string
  })(config);

  return this.client.createRequest({
    method: 'GET',
    path: '/staticmap/route',
    query: config,
    encoding: 'binary'
  });
};

module.exports = createServiceFactory(Static);
