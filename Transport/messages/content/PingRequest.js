'use strict';
/**
  * Message content for Ping Request
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

module.exports = class PingRequest extends Content {
  constructor() {
    super();
    this.message_code = 0x17;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeStringNT('');
    return buffer;
  }
  static deSerialize(buffer) {
    buffer.readStringNT();
    return {buffer: buffer, data: new PingRequest()};
  }
}
