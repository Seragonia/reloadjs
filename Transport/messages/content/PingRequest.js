'use strict';
/**
  * Message content for Ping Request
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;
const argv        = require('minimist')(process.argv.slice(2));
const fs = require('fs');

module.exports = class PingRequest extends Content {
  constructor() {
    super();
    this.message_body.ips = JSON.stringify(global.ips);
    this.message_body.port = Number.isInteger(argv['port']) ? argv['port'] : JSON.parse(fs.readFileSync('./utils/config.json', 'utf-8')).global.listenport;
    this.message_code = 0x17;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeStringNT(this.message_body.ips);
    buffer.writeUInt32BE(this.message_body.port);
    return buffer;
  }
  static deSerialize(buffer) {
    var pingReq = new PingRequest();
    pingReq.message_body.ips = JSON.parse(buffer.readStringNT());
    pingReq.message_body.port = buffer.readUInt32BE();
    //console.log(pingReq);
    return {buffer: buffer, data: pingReq};
  }
}
