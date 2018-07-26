'use strict';
/**
  * Message content for Update Answer
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

module.exports = class UpdateRequest extends Content {
  constructor() {
    super();
    this.message_code = 0x13;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    return buffer;
  }
  static deSerialize(buffer) {
    return {buffer: buffer, data: new UpdateRequest()};
  }
}
