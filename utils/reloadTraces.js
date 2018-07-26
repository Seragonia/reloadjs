var date = new Date();
const fs = require("fs");

//Default values
var modeDebug = false;
var modeInfo = true;
var modeError = true;
var modeWarning = true;

exports.setConfig = function(config) {
  modeDebug = config.logOptions.debug;
  modeInfo = config.logOptions.info;
  modeError = config.logOptions.error;
  modeWarning = config.logOptions.warning;
}

exports.debug = function (msg) {
  if(modeDebug) {
    console.log('\x1b[36m%s\x1b[0m',"[DEBUG   | "+ getCurrentTime() +"] : " + msg);
    for(var client of global.clientsWeb)
    {
      client.emit('log-dbg', "[DEBUG   | "+ getCurrentTime() +"] : " + msg);
    }
  }
}

exports.info = function (msg) {
  if(modeInfo) {
    console.log('\x1b[32m%s\x1b[0m',"[INFO    | "+ getCurrentTime() +"] : " + msg);
    for(var client of global.clientsWeb)
    {
      client.emit('log-info', "[INFO    | "+ getCurrentTime() +"] : " + msg);
    }
  }
}

exports.error = function (msg) {
  if(modeError)
  {
    console.log('\x1b[41m\x1b[37m%s\x1b[0m',"[ERROR   | "+ getCurrentTime() +"] : " + msg);
    for(var client of global.clientsWeb)
    {
      client.emit('log-err', "[ERROR   | "+ getCurrentTime() +"] : " + msg);
    }
  }
}

exports.warning = function (msg) {
  if(modeWarning) {
    console.log('\x1b[33m%s\x1b[0m',"[WARNING | "+ getCurrentTime() +"] : " + msg);
    for(var client of global.clientsWeb)
    {
      client.emit('log-war', "[WARNING | "+ getCurrentTime() +"] : " + msg);
    }
  }
}

function getCurrentTime() {
  var date = new Date();
  return (date.getHours() < 10 ? '0' : '') + date.getHours()
          + ":"
          + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
          + ":"
          + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
}
exports.getTime = getCurrentTime;
