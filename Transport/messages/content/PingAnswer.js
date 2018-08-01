'use strict';
/**
  * Message content for Ping Request
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

module.exports = class PingAnswer extends Content {
  constructor() {
    super();
    this.message_body.number = Math.floor(Math.random() * Math.floor(4294967296));
    var x = new Date();
    x.setHours(x.getHours() - x.getTimezoneOffset() / 60);
    this.message_body.time = x.toString();
    this.message_code = 0x18;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeUInt32BE(this.message_body.number);
    buffer.writeStringNT(this.message_body.time);
    return buffer;
  }
  static deSerialize(buffer) {
    var number = buffer.readUInt32BE();
    var date = new Date(buffer.readStringNT());
    var d = new PingAnswer();
    d.message_body.number = number;
    d.message_body.time = date;
    return {buffer: buffer, data: d};
  }
}
