/**
 * Updated by crivas on 04/17/2015.
 */

'use strict';

var fs = require('fs'),
  through2 = require('through2'),
  path = require('path'),
  gutil = require('gulp-util'),
  _ = require('underscore-node'),
  File = gutil.File,
  Concat = require('concat-with-sourcemaps'),
  PluginError = gutil.PluginError;

module.exports = function (file) {

  if (!file) {
    throw new PluginError('gulp-omnp', 'Missing file option for gulp-omnp');
  }

  var opt = {},
    bufferedContentObj = [],
    firstFile,
    fileName,
    concat,
    types = ['click', 'pageload'],
    objIndex = 0;

  opt.newLine = gutil.linefeed;

  if (typeof file === 'string') {
    fileName = file;
  } else if (typeof file.path === 'string') {
    fileName = path.basename(file.path);
    firstFile = new File(file);
  } else {
    throw new PluginError('gulp-omnp', 'Missing path in file options for gulp-omnp');
  }

  /**
   *
   * @param i
   * @returns {string}
   */
  var getType = function (i) {
    return types[i];
  };

  /**
   *
   * @param file - file object in stream
   * @param enc - encoding of file in stream
   * @param cb - callback function
   */
  var bufferContents = function (file, enc, cb) {

    if (file.isStream()) {

      this.emit('error', new gutil.PluginError('gulp-omnp', 'Streams are not supported!'));
      cb();

    } else if (file.isNull()) {

      cb(null, file); // Do nothing if no contents

    } else {

      // set first file if not already set
      if (!firstFile) {
        firstFile = file;
      }

      // construct concat instance
      if (!concat) {
        concat = new Concat(false, fileName, opt.newLine);
      }

      bufferedContentObj.push({
        contents: file.contents,
        type: getType(objIndex)
      });

      objIndex += 1;

      // add file to concat instance
      concat.add(file.relative, file.contents, file.sourceMap);

      cb();

    }

  };

  /**
   * top level containter of the converted CSV data to JSON
   * @type {{}}
   */
  var containerObject = {};

  /**
   * converts csv to json
   * @param bufferedArray
   */
  var convertToObject = function (bufferedArray) {

    var lines,
      headers,
      propertyName,
      currentTagObject = {},
      currentLine;

    _.each(bufferedArray, function (data) {

      containerObject[data.type] = containerObject[data.type] || {};

      // look at contents of each object and convert to string then split on new lines
      lines = data.contents.toString('utf-8').split('\n');
      // save headers to be index 0 of lines then split on commas
      headers = lines[0].split(',');

      _.each(lines, function (eachLine, index) {

        if (index > 0) {

          currentLine = eachLine.split(',');
          propertyName = currentLine[0];

          if (!propertyName || propertyName === '') {
            return;
          }

          var idPropName = data.type + '-' + propertyName,
            obj;

          if (!_.isNull(containerObject[idPropName]) && !_.isUndefined(containerObject[idPropName])) {
            return;
          } else {
            obj = currentTagObject[idPropName] = {};
          }

          _.each(currentLine, function (eachProp, index) {

            if (index > 0 && !eachProp && eachProp !== '') {
              obj[headers[index]] = eachProp;
            }

          });

          containerObject[data.type][idPropName] = {
            type: data.type,
            data: obj
          };

        }

      });

    });

    return JSON.stringify(containerObject);

  };

  /**
   *
   * @param cb - callback function
   */
  var endStream = function (cb) {

    // no files passed in, no file goes out
    if (!firstFile || !concat) {
      cb();
      return;
    }

    var joinedFile;

    // if file opt was a file path
    // clone everything from the first file
    if (typeof file === 'string') {

      joinedFile = firstFile.clone({ contents: false });
      joinedFile.path = path.join(firstFile.base, file);

    } else {

      joinedFile = firstFile;

    }

    var convertedCSV = convertToObject(bufferedContentObj);

    joinedFile.contents = new Buffer(convertedCSV);

    this.push(joinedFile);

    cb();

  };

  /**
   * returns streamed content
   */
  return through2.obj(bufferContents, endStream);

};