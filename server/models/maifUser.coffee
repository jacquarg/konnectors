cozydb = require 'cozydb'

MaifUser = cozydb.getModel 'MaifUser',
  password:
        type: String
  profile: 
  		type: Object

module.exports = MaifUser

MaifUser.all = (callback) -> 
    MaifUser.request "all", {}, (err, tasks) ->
        error = err || tasks.error;
        callback error, tasks;

MaifUser.getOne = (callback) ->
    MaifUser.request "all", {}, (err, maifusers) ->
        error = err || maifusers.error;
        callback error, maifusers[0];
