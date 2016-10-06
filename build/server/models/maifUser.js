const cozydb = require('cozydb');

const MaifUser = cozydb.getModel('MaifUser', {
    'password': { //'password' = crypted token
        type: String,
    },
    'profile': { //JSON data
        type: Object,
    }
});

module.exports = MaifUser;

MaifUser.all = (callback) => {
    MaifUser.request('all', {}, (err, tasks) => {
        const error = err || tasks.error;
        callback(error, tasks);
    });
};

MaifUser.getOne = (callback) => {
    MaifUser.request('all', {}, (err, maifusers) => {
        const error = err || maifusers.error;
        callback(error, maifusers[0]);
    });
};