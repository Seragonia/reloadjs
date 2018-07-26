'use strict';
/**
  * Message content for Update Answer
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

module.exports = class UpdateAnswer extends Content {
  constructor() {
    super();
    this.message_code = 0x14;
    this.message_body.predecessors = JSON.stringify(Array.from(global.topology.routing.predecessors));
    this.message_body.successors = JSON.stringify(Array.from(global.topology.routing.successors));
    this.message_body.startTime = Date.now().toString(); //string with the start time number (to be substracted)
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeStringNT(this.message_body.predecessors);
    buffer.writeStringNT(this.message_body.successors);
    buffer.writeStringNT(this.message_body.startTime.toString());
    return buffer;
  }
  static deSerialize(buffer) {
    var predecessors = JSON.parse(buffer.readStringNT());
    var successors = JSON.parse(buffer.readStringNT());
    var startTime = buffer.readStringNT();
    var req = new UpdateAnswer();
    req.message_body.predecessors = predecessors;
    req.message_body.successors = successors;
    req.message_body.startTime = startTime;
    return {buffer: buffer, data: req};
  }
}
