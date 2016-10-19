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

const MaifUser = require('../models/maifuser');

// const client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
// const secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
// const client_id = "client-id";
// const secret = "eX3mp1e";

const env = "pprod"; //dev / pprod / prod

var connect_url, apikey, info_url, client_id, secret;

switch(env){
  case "dev":
    connect_url = "http://connect-dev-d.maif.local/connect";
    apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
    info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
  case "pprod":
    // connect_url = "http://connect-maiffr-pprodcorr.maif.local/connect/";
    connect_url = "https://connectbuild.maif.fr/connect";
    apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
    info_url = "https://openapiweb-build.maif.fr/ppcor/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
  case "prod":
    connect_url = "https://connect.maif.fr/connect";
    apikey = "eeafd0bd-a921-420e-91ce-3b52ee5807e8";
    info_url = "https://openapiweb.maif.fr/prod/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
  default:
    connect_url = "http://connect-dev-d.maif.local/connect";
    apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
    info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey="+apikey;
    client_id = "eea55366-14b5-4609-ac4d-45f6abfad351";
    secret = "AILc_ai8K1o68uEnx56L2V9v08siwCIuvWmQSjbpcfq9_wwtxQYw20SjMi9NXZaT3Wi0jWuSQwTlpufQ4UzGXz4";
  break;
}


// get code/token url
// const connect_url = "https://connectbuild.maif.fr/connect";
//dev
// const connect_url = "http://connect-dev-d.maif.local/connect";
//preprod, a priori
// const connect_url = "http://connect-maiffr-pprodcorr.maif.local/connect/";
//prod ?
// const connect_url = "https://connectbuild.maif.fr/connect"; //?

//dev
// const apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
//preprod
// const apikey = "1f3299b5-967c-46ae-9bbe-94c22051da5e";
//prod
// const apikey = "eeafd0bd-a921-420e-91ce-3b52ee5807e8";

//dev
// const info_url = "http://slapp671.maif.local:7080/mapa/cozy/v1/mes_infos?apikey="+apikey;
//preprod
// const info_url = "https://openapiweb-build.maif.fr/ppcor/cozy/v1/mes_infos?apikey="+apikey;
//prod
// const info_url = "https://openapiweb.maif.fr/prod/cozy/v1/mes_infos?apikey="+apikey;

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
        'MaifConnect', 'width=800,height=800')
       return false;"
       >Connexion</button>`,

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
  // console.log("connect url : " + base_url + toQueryString(params));
  return base_url + toQueryString(params);
}

/**
* called with connection's callback.
* get code from data
* create or update user in db
* call post request to get token
*/
module.exports.getCode = (req, res) => {
  // console.log("GETCODE");
  const payload = {};

  /*console.log("connect url : " + connect_url);
  console.log("info url : " + info_url);
  console.log("client id : " + client_id);
  console.log("secret : " + secret);*/

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
      if(domain.indexOf("localhost") != -1){ //contains localhost, transform https to http
        domain = domain.replace("https", "http");
      }

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
      connecteur.logger.info(options);
      request(options, (err, response, body) =>{
        if(err != null){
          connecteur.logger.error(err);
          res.status(500).send("Erreur lors de la récupération des données.");
        }
        else{
          var json_token = JSON.parse(body);
          var token = json_token.id_token;
          var token_refresh = json_token.refresh_token;
          getToken(token, token_refresh, res);
        }
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
  // console.log("get token with token : " + token);
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
  // console.log("----------- get data");
  MaifUser.getOne((err, maifuser) => {

    var options = {
      url: info_url,
      jar: true,
      method: 'GET',
      headers: {
        Authorization: "Bearer " +token
      }
    };

    // console.log(options);

    request(options, (err, response, body) =>{
      // console.log("------------- get data response");
      // console.log(body);
      if(err != null){
        if(res != undefined){
          res.status(500).send("Erreur lors de la récupération des données.");
        }
        else{
          sendNotification('data retrieved failed', 'konnectors/konnector/maif');
        }
      }
      else{
        var payload = {profile: JSON.parse(body)};

        maifuser.updateAttributes(payload, (err) => { //mise à jour du maifuser en base en insérant le token
          sendNotification('data retrieved', 'mes-infos-maif');
          if(res != undefined){
            res.status(200).send("Données récupérées avec succès.");
          }
        });
      }
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
          try {
            JSON.parse(body);
          } catch (e) {
            err = "error";
          }
          if(err != null){ //refresh token not valid anymore
            sendNotification('refresh token not valid', 'konnectors/konnector/maif');
          }
          else{
            var json_token = JSON.parse(body);
            var token = json_token.id_token;
            var token_refresh = json_token.refresh_token;
            getToken(token, token_refresh);
          }
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
      sendNotification('refresh token not valid', 'konnectors/konnector/maif');
    }
  });
}

/**
* Display a notification in Cozy
* code : code of the message to send
* appToOpen : Link to the app that will be opened on notification's click
*/
function sendNotification(code, appToOpen){
  code = code == undefined ? "" : code;
  appToOpen = appToOpen == undefined ? 'konnectors/konnector/maif' : appToOpen;
  var notifContent = localization.t(code, {});
  notifHelper.createTemporary({
    app: 'konnectors',
    text: notifContent,
    resource: {
      app: appToOpen,
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