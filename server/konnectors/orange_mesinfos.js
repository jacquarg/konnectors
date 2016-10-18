'use strict';

const async = require('async');
const request = require('request');
const moment = require('moment');
const toQueryString = require('querystring').stringify;

const baseKonnector = require('../lib/base_konnector');
const localization = require('../lib/localization_manager');

//const API_ROOT = ;

/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
const connector = module.exports = baseKonnector.createNew({
  name: 'Orange MesInfos',
  slug: 'orange_mesinfos',
  connectUrl:  'https://mesinfos.orange-labs.fr/auth?redirect_url=',
  fields: {
    access_token: 'text',
  },

  models: [Event],

  fetchOperations: [
    downloadData,
  ],

});


function downloadData(requiredFields, entries, data, next) {
  connector.logger.info('Downloading events data from Facebook...');

  request.get('https://mesinfos.orange-labs.fr/data', { auth: { bearer: requiredFields.access_token }},
    (err, res, body) => {
      if (err) {
        connector.logger.error(`Download failed: ${err.msg}`);
      } else {
        connector.logger.info('Download succeeded.');
        connector.logger.info(body);
      }
      next(err);
    });
}


