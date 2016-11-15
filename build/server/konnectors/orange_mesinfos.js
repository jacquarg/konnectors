'use strict';

var async = require('async');
var request = require('request');
var moment = require('moment');
var toQueryString = require('querystring').stringify;

var baseKonnector = require('../lib/base_konnector');
var localization = require('../lib/localization_manager');

//const API_ROOT = ;

/*
 * The goal of this connector is to fetch event from facebook and store them
 * in the Cozy
 */
var connector = module.exports = baseKonnector.createNew({
  name: 'Orange MesInfos',
  slug: 'orange_mesinfos',
  connectUrl: 'https://mesinfos.orange-labs.fr/auth?redirect_url=',
  fields: {
    access_token: 'text'
  },

  models: [],

  fetchOperations: [downloadData]

});

function downloadData(requiredFields, entries, data, next) {
  connector.logger.info('Downloading events data from Facebook...');

  request.get('https://mesinfos.orange-labs.fr/data', { auth: { bearer: requiredFields.access_token } }, function (err, res, body) {
    if (err) {
      connector.logger.error('Download failed: ' + err.msg);
    } else {
      connector.logger.info('Download succeeded.');
      connector.logger.info(body);
    }
    next(err);
  });
}