/**
* MAIF Cozy's konnector
*/

'use strict';

var request = require('request');
var cheerio = require('cheerio');
var moment = require('moment');
var toQueryString = require('querystring').stringify;

var instance = require('cozydb');

var localization = require('../lib/localization_manager');
var NotifHelper = require('cozy-notifications-helper');
var notifHelper = new NotifHelper('konnectors');

var factory = require('../lib/base_konnector');

var MaifUser = require('../models/maifuser');

var client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
var secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
// const client_id = "client-id";
// const secret = "eX3mp1e";

var connect_url = "http://connect-dev-d.maif.local/connect";
// const connect_url = "https://connectbuild.maif.fr/connect";
var info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey=1f3299b5-967c-46ae-9bbe-94c22051da5e ";
// const info_url = "https://openapi.maif.fr/userInfo";

var scope = "openid+profile+offline_access";
var type = "code";
var state = "";
var nonce = "";

//TEST
// const societaire_login = "3466222n";
// const societaire_pwd = "Maif1234";
//TEST

if (state == "") {
  state = generateUUID();
}

if (nonce == "") {
  nonce = generateUUID();
}

var connecteur = module.exports = factory.createNew({
  name: 'MAIF',
  slug: "MAIF",
  description: 'konnector description MAIF',
  customView: '<h5>Connectez-vous pour récupérer vos données</h5>\n  <button id="connect-maif" class="btn" \n    onclick="window.open(\'' + getConnectUrl() + '\' + \'&redirect_uri=\' + \n        document.location.origin + \'/apps/konnectors/public/getCode\',\n        \'MaifConnect\', \'width=800,height=600\')\n       return false;"\n       >Connexion</button>',

  fields: {},

  models: [MaifUser],
  fetchOperations: [refreshToken]
});

/**
* return connection url with all params
*/
function getConnectUrl() {
  var base_url = connect_url + "/authorize?";
  var params = {
    response_type: type,
    client_id: client_id,
    scope: scope,
    state: state,
    nonce: nonce
  };
  return base_url + toQueryString(params);
}

/**
* called with connection's callback.
* get code from data
* create or update user in db
* call post request to get token
*/
module.exports.getCode = function (req, res) {
  console.log("get code module");
  var payload = {};

  MaifUser.getOne(function (err, maifuser) {
    //check if user doesn't already exist in database
    if (maifuser == undefined) {
      console.log("create user");
      MaifUser.create(payload, function (err, maifuser) {//creation du maifuser dans db avec le code
      });
    } else {
      console.log("got user");
      maifuser.updateAttributes(payload, function (err) {//mise à jour du maifuser en base avec le code
      });
    }

    var b64client = new Buffer(client_id + ':' + secret).toString('base64');

    instance.api.getCozyDomain(function (err, domain) {
      // if(domain.indexOf("localhost") != -1){ //contains localhost, transform https to http
      //   domain = domain.replace("https", "http");
      // }

      var url_redirect = domain + 'apps/konnectors/public/getCode';
      var options = {
        url: connect_url + "/token",
        jar: true,
        method: 'POST',
        headers: {
          Authorization: "Basic " + b64client
        },
        form: {
          grant_type: "authorization_code",
          code: res.req.query.code,
          state: state,
          nonce: nonce,
          redirect_uri: url_redirect
        }
      };
      request(options, function (err, response, body) {
        if (err != null) {
          res.status(500).send("Erreur lors de la récupération des données.");
        }

        var json_token = JSON.parse(body);
        var token = json_token.id_token;
        var token_refresh = json_token.refresh_token;

        getToken(token, token_refresh, res);
      }, false);
    });
  });
};

/**
* function called when token returns
* update user's line in db with token_refresh
* call getData function
*/
function getToken(token, token_refresh, res) {
  var payload = { password: token_refresh };

  MaifUser.getOne(function (err, maifuser) {
    maifuser.updateAttributes(payload, function (err) {
      //mise à jour du maifuser en base en insérant le token
      getData(token, res);
    });
  });
}

/**
* function called after getToken
* sends get request with token to get JSON data in return
*/
function getData(token, res) {
  MaifUser.getOne(function (err, maifuser) {

    var options = {
      url: info_url,
      jar: true,
      method: 'GET',
      headers: {
        Authorization: "Bearer " + token
      }
    };

    request(options, function (err, response, body) {
      if (err != null && res != undefined) {
        res.status(500).send("Erreur lors de la récupération des données.");
      }
      var payload = { profile: JSON.parse(body) };

      maifuser.updateAttributes(payload, function (err) {
        //mise à jour du maifuser en base en insérant le token
        if (res != undefined) {
          res.status(200).send("Données récupérées avec succès.");
        }
        connecteur.logger.info("DONNEES RECUPEREES ET INSEREES AVEC SUCCES");
      });
    }, false);
  });
}

/**
* refreshToken function
* called at each scheduled import (every hour/day/week/month)
* get new token and refresh token
* call getToken with token and refresh token
*/
function refreshToken() {
  MaifUser.getOne(function (err, maifuser) {
    var token_valid = true;
    if (maifuser != undefined) {
      var token = maifuser['password'];
      if (token != undefined) {
        var b64client = new Buffer(client_id + ':' + secret).toString('base64');
        var options = {
          url: connect_url + "/token",
          jar: true,
          method: 'POST',
          headers: {
            Authorization: "Basic " + b64client
          },
          form: {
            grant_type: "refresh_token",
            refresh_token: token
          }
        };
        var data = {
          Header: "Authorization: Basic " + b64client,
          Data: "grant_type=refresh_token&refresh=" + token
        };
        request(options, function (err, response, body) {
          if (err != null || JSON.parse(body).id_token == undefined) {
            //refresh token not valid anymore
            token_valid = false;
          }
          var json_token = JSON.parse(body);
          var token = json_token.id_token;
          var token_refresh = json_token.refresh_token;
          connecteur.logger.info("refresh token function done");
          getToken(token, token_refresh);
        }, false);
      } else {
        token_valid = false;
      }
    } else {
      token_valid = false;
    }
    if (!token_valid) {
      connecteur.logger.error("Token non valide. Veuillez vous reconnecter.");
      var notifContent = localization.t('refresh token not valid', {});
      notifHelper.createTemporary({
        app: 'konnectors',
        text: notifContent,
        resource: {
          app: 'konnectors/konnector/maif'
        }
      });
    }
  });
}

/**
* generate UUID for nonce and state parameters
*/
function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
  });
  return uuid;
};