// Generated by CoffeeScript 1.10.0
var OVHFetcher, async, cozydb, fetcher, moment,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

cozydb = require('cozydb');

moment = require('moment');

async = require('async');

fetcher = require('../lib/fetcher');

OVHFetcher = (function() {
  function OVHFetcher(ovhApi, slug, logger) {
    this.needToConnectFirst = bind(this.needToConnectFirst, this);
    this.saveUrlAndToken = bind(this.saveUrlAndToken, this);
    this.fetchBills = bind(this.fetchBills, this);
    this.ovh = require('ovh')(ovhApi);
    this.slug = slug;
    this.logger = logger;
  }

  OVHFetcher.prototype.fetchBills = function(requiredFields, bills, data, next) {
    this.ovh.consumerKey = requiredFields.token || null;
    if (!this.ovh.consumerKey) {
      return this.needToConnectFirst(requiredFields, next);
    }
    return this.ovh.request('GET', '/me/bill', (function(_this) {
      return function(err, ovhBills) {
        if (err === 401 || err === 403) {
          return _this.needToConnectFirst(requiredFields, next);
        } else if (err) {
          _this.logger.info(err);
          return next('bad credentials');
        }
        return async.map(ovhBills, function(ovhBill, cb) {
          return _this.ovh.request('GET', '/me/bill/' + ovhBill, cb);
        }, function(err, ovhBills) {
          if (err) {
            _this.logger.info(err);
            return next('request error');
          }
          bills.fetched = [];
          ovhBills.forEach(function(ovhBill) {
            var bill;
            bill = {
              date: moment(ovhBill.date),
              amount: ovhBill.priceWithTax.value,
              pdfurl: ovhBill.pdfUrl,
              vendor: 'OVH',
              type: 'hosting'
            };
            return bills.fetched.push(bill);
          });
          _this.logger.info('Bill data parsed.');
          return next();
        });
      };
    })(this));
  };

  OVHFetcher.prototype.getLoginUrl = function(callback) {
    var accessRules;
    accessRules = {
      'accessRules': [
        {
          method: 'GET',
          path: '/me/*'
        }
      ]
    };
    this.logger.info('Request the login url...');
    return this.ovh.request('POST', '/auth/credential', accessRules, function(err, credential) {
      if (err) {
        this.logger.info(err);
        return callback('token not found');
      }
      return callback(null, credential.validationUrl, credential.consumerKey);
    });
  };

  OVHFetcher.prototype.saveUrlAndToken = function(url, token, callback) {
    var Konnector;
    Konnector = require('../models/konnector');
    return Konnector.all((function(_this) {
      return function(err, konnectors) {
        var accounts, ovhKonnector;
        if (err) {
          return callback(err);
        }
        ovhKonnector = (konnectors.filter(function(konnector) {
          return konnector.slug === _this.slug;
        }))[0];
        accounts = [
          {
            loginUrl: url,
            token: token
          }
        ];
        return ovhKonnector.updateAttributes({
          accounts: accounts
        }, callback);
      };
    })(this));
  };

  OVHFetcher.prototype.needToConnectFirst = function(requiredFields, callback) {
    this.ovh.consumerKey = null;
    return this.getLoginUrl((function(_this) {
      return function(err, url, token) {
        if (err) {
          _this.logger.info(err);
          return callback('request error');
        }
        requiredFields.loginUrl = url;
        requiredFields.token = token;
        return _this.saveUrlAndToken(url, token, function() {
          this.logger.info('You need to login to your OVH account first.');
          return callback('konnector ovh connect first');
        });
      };
    })(this));
  };

  return OVHFetcher;

})();

module.exports = {
  "new": function(ovhApi, slug, logger) {
    return new OVHFetcher(ovhApi, slug, logger);
  }
};
