/**
 * Updated by crivas on 04/17/2015.
 */

'use strict';

var fs = require('fs'),
  through = require('through2'),
  gutil = require('gulp-util'),
  _ = require('underscore-node');

module.exports = function () {

  /**
   * sorts json alphabetically and returns the modified object
   * @param object
   * @returns {object}
   */
  var sortObject = function (object, file) {

    var sortedObj = {},
      parsedObject = JSON.parse(object),
      cleanedObject = {},
      fileName = file.history[0],
      keys;

    console.log(fileName, 'contains', _.keys(parsedObject).length, 'keys BEFORE clean and sort');

    _.each(parsedObject, function (prop, key) {
      var cleanKey = key.replace(/^_/, '').replace(/_/g, '-');
      cleanedObject[cleanKey] = prop;
    });

    keys = _.sortBy(_.keys(cleanedObject), function (key) {
      return key.toLowerCase();
    });

    _.each(keys, function (key) {
      if (sortedObj[key]) {
        console.log('key', key, 'already exists and will be overwritten');
      }
      if (typeof object[key] == 'object' && !(object[key] instanceof Array)) {
        sortedObj[key] = sortObject(cleanedObject[key]);
      } else {
        sortedObj[key] = cleanedObject[key];
      }
    });

    console.log(fileName, 'contains', _.keys(cleanedObject).length, 'keys AFTER clean and sort');

    return JSON.stringify(sortedObj);

  };

  /**
   *
   * @param file
   * @param enc
   * @param callback
   */
  var bufferedContents = function (file, enc, callback) {

    if (file.isStream()) {

      this.emit('error', new gutil.PluginError('ute-json-sorter', 'Streams are not supported!'));
      callback();

    } else if (file.isNull()) {

      callback(null, file); // Do nothing if no contents

    } else {

      var ctx = file.contents.toString('utf8');

      file.contents = new Buffer(sortObject(ctx, file));
      callback(null, file);

    }

  };

  /**
   * returns streamed content
   */
  return through.obj(bufferedContents);


};
