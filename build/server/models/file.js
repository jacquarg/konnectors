// Generated by CoffeeScript 1.9.3
var Binary, File, americano, fs, log, moment, request;

fs = require('fs');

americano = require('cozydb');

request = require('request');

moment = require('moment');

Binary = require('./binary');

log = require('printit')({
  prefix: 'konnectors'
});

module.exports = File = americano.getModel('File', {
  path: String,
  name: String,
  creationDate: String,
  lastModification: String,
  "class": String,
  mime: String,
  size: Number,
  binary: Object,
  modificationHistory: Object,
  clearance: [Object],
  tags: [String]
});

File.all = function(params, callback) {
  return File.request("all", params, callback);
};

File.byFolder = function(params, callback) {
  return File.request("byFolder", params, callback);
};

File.byFullPath = function(params, callback) {
  return File.request("byFullPath", params, callback);
};

File.isPresent = function(fullPath, callback) {
  return File.request("byFullPath", {
    key: fullPath
  }, function(err, files) {
    if (err) {
      callback(err);
    }
    return callback(null, (files != null) && files.length > 0);
  });
};

File.createNew = function(fileName, path, date, url, tags, callback) {
  var attachBinary, data, filePath, index, now, options, stream;
  now = moment().toISOString();
  filePath = "/tmp/" + fileName;
  data = {
    name: fileName,
    path: path,
    creationDate: now,
    lastModification: now,
    tags: tags,
    "class": 'document',
    mime: 'application/pdf'
  };
  index = function(newFile) {
    return newFile.index(["name"], function(err) {
      if (err && Object.keys(err).length !== 0) {
        log.error(err);
      }
      return File.find(newFile.id, function(err, file) {
        return callback(err, file);
      });
    });
  };
  attachBinary = function(newFile) {
    return newFile.attachBinary(filePath, {
      "name": "file"
    }, function(err) {
      if (err) {
        log.error(err);
        return callback(err);
      } else {
        return fs.unlink(filePath, function() {
          return index(newFile);
        });
      }
    });
  };
  options = {
    uri: url,
    method: 'GET',
    jar: true
  };
  stream = request(options, function(err, res, body) {
    var stats;
    if ((res != null ? res.statusCode : void 0) === 200) {
      try {
        stats = fs.statSync(filePath);
        data.size = stats["size"];
        return File.create(data, function(err, newFile) {
          if (err) {
            log.error(err);
            return callback(err);
          } else {
            return attachBinary(newFile);
          }
        });
      } catch (_error) {
        err = _error;
        return callback(err);
      }
    } else {
      if (res != null) {
        log.error(res.statusCode, res.body);
      }
      return callback(new Error('Cannot download file, wrong url'));
    }
  });
  return stream.pipe(fs.createWriteStream(filePath));
};

File.prototype.destroyWithBinary = function(callback) {
  var binary;
  if (this.binary != null) {
    binary = new Binary(this.binary.file);
    return binary.destroy((function(_this) {
      return function(err) {
        if (err) {
          log.error("Cannot destroy binary linked to document " + _this.id);
        }
        return _this.destroy(callback);
      };
    })(this));
  } else {
    return this.destroy(callback);
  }
};
