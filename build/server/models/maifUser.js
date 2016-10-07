// Generated by CoffeeScript 1.10.0
var MaifUser, cozydb;

cozydb = require('cozydb');

MaifUser = cozydb.getModel('MaifUser', {
  password: {
    type: String
  },
  profile: {
    type: Object
  }
});

module.exports = MaifUser;

MaifUser.all = function(callback) {
  return MaifUser.request("all", {}, function(err, tasks) {
    var error;
    error = err || tasks.error;
    return callback(error, tasks);
  });
};

MaifUser.getOne = function(callback) {
  return MaifUser.request("all", {}, function(err, maifusers) {
    var error;
    error = err || maifusers.error;
    console.log(err);
    return callback(error, maifusers[0]);
  });
};
