'use strict';
/**
  * Message content for Join Answer
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

module.exports = class JoinAnswer extends Content {
  constructor() {
    super();
    this.message_code = 0x10;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeStringNT('');
    return buffer;
  }
  static deSerialize(buffer) {
    buffer.readStringNT();
    return {buffer: buffer, data: new JoinAnswer()};
  }
}
