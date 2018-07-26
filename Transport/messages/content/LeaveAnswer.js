'use strict';
/**
  * Message content for Leave Answer
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

module.exports = class LeaveAnswer extends Content {
  constructor() {
    super();
    this.message_code = 0x12;
  }
  serialize(buffer) {
    buffer.writeStringNT('');
    return buffer;
  }
  static deSerialize(buffer) {
    buffer.readStringNT();
    return {buffer: buffer, data: new LeaveAnswer()};
  }
}
