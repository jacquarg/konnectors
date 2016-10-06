/**
* MAIF Cozy's konnector
*/

'use strict';

const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const toQueryString = require('querystring').stringify;

const instance = require('cozydb');

const localization = require('../lib/localization_manager');
const NotifHelper = require('cozy-notifications-helper');
const notifHelper = new NotifHelper('konnectors');

const factory = require('../lib/base_konnector');

const MaifUser = require('../models/maifUser');

const client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
const secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
// const client_id = "client-id";
// const secret = "eX3mp1e";

const connect_url = "http://connect-dev-d.maif.local/connect";
// const connect_url = "https://connectbuild.maif.fr/connect";
const info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey=1f3299b5-967c-46ae-9bbe-94c22051da5e ";
// const info_url = "https://openapi.maif.fr/userInfo";

const scope = "openid+profile+offline_access";
const type = "code";
var state = "";
var nonce = "";

//TEST
// const societaire_login = "3466222n";
// const societaire_pwd = "Maif1234";
//TEST

if(state == ""){
  state = generateUUID();
}

if(nonce == ""){
  nonce = generateUUID();
}


const connecteur = module.exports = factory.createNew({
  name: 'MAIF',
  slug: "MAIF",
  description: 'konnector description MAIF',
  customView: `<h5>Connectez-vous pour récupérer vos données</h5>
  <button id="connect-maif" class="btn" 
    onclick="window.open('${getConnectUrl()}' + '&redirect_uri=' + 
        document.location.origin + '/apps/konnectors/public/getCode',
        'Maif OAuth')
       return false;"
       >Connexion</button>`, //, 'width=800,height=600'

  fields: {
  },

  models: [MaifUser],
  fetchOperations: [
  refreshToken
  ]
});

/**
* return connection url with all params
*/
function getConnectUrl(){
  var base_url = connect_url + "/authorize?";
  const params = {
    response_type: type,
    client_id,
    scope,
    state,
    nonce
  };
  return base_url + toQueryString(params);
}

/**
* called with connection's callback.
* get code from data
* create or update user in db
* call post request to get token
*/
module.exports.getCode = (req, res) => {
  const payload = {};

  MaifUser.getOne(function(err, maifuser){ //check if user doesn't already exist in database
    if(maifuser == undefined){
        MaifUser.create(payload, (err, maifuser) => { //creation du maifuser dans db avec le code
        });
    }
    else{
        maifuser.updateAttributes(payload, (err) => { //mise à jour du maifuser en base avec le code
        });
    }

    var b64client = new Buffer(client_id+':'+secret).toString('base64');

    instance.api.getCozyDomain((err, domain) => {
      // if(domain.indexOf("localhost") != -1){ //contains localhost, transform https to http
      //   domain = domain.replace("https", "http");
      // }

      var url_redirect = domain + 'apps/konnectors/public/getCode';
      var options = {
        url: connect_url+"/token",
        jar: true,
        method: 'POST',
        headers: {
          Authorization: "Basic " +b64client
        },
        form:{
          grant_type: "authorization_code",
          code: res.req.query.code,
          state: state,
          nonce :nonce,
          redirect_uri :url_redirect
        }
      };
      request(options, (err, response, body) =>{
        if(err != null){
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
function getToken(token, token_refresh, res){
  const payload = {password: token_refresh};

  MaifUser.getOne((err, maifuser) => {
    maifuser.updateAttributes(payload, (err) => { //mise à jour du maifuser en base en insérant le token
        getData(token, res);
        
    });
  });
}

/**
* function called after getToken
* sends get request with token to get JSON data in return
*/
function getData(token, res){
  MaifUser.getOne((err, maifuser) => {

    var options = {
      url: info_url,
      jar: true,
      method: 'GET',
      headers: {
        Authorization: "Bearer " +token
      }
    };

    request(options, (err, response, body) =>{
      if(err != null && res != undefined){
        res.status(500).send("Erreur lors de la récupération des données.");
      }
      var payload = {profile: JSON.parse(body)};

      maifuser.updateAttributes(payload, (err) => { //mise à jour du maifuser en base en insérant le token
        if(res != undefined){
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
function refreshToken(){
  MaifUser.getOne((err, maifuser) => {
    var token_valid = true;
    if(maifuser != undefined){
        var token = maifuser['password'];
      if(token != undefined){
        var b64client = new Buffer(client_id+':'+secret).toString('base64');
        var options = {
          url: connect_url+"/token",
          jar: true,
          method: 'POST',
          headers: {
            Authorization: "Basic " +b64client
          },
          form:{
            grant_type: "refresh_token",
            refresh_token: token,
          }
        };
        var data = {
          Header : "Authorization: Basic "+b64client,
          Data : "grant_type=refresh_token&refresh=" + token
        };
        request(options, (err, response, body) => {
          if(err != null || JSON.parse(body).id_token == undefined){ //refresh token not valid anymore
            token_valid = false;
          }
          var json_token = JSON.parse(body);
          var token = json_token.id_token;
          var token_refresh = json_token.refresh_token;
          connecteur.logger.info("refresh token function done");
          getToken(token, token_refresh);
        }, false);
      }
      else{
        token_valid = false;
      }
    }
    else{
      token_valid = false
    }
    if(!token_valid){
      connecteur.logger.error("Token non valide. Veuillez vous reconnecter.");
      const notifContent = localization.t('refresh token not valid', {});
      notifHelper.createTemporary({
        app: 'konnectors',
        text: notifContent,
        resource: {
          app: 'konnectors/konnector/maif',
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
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};