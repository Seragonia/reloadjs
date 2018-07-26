'use strict';
/**
  * Message content for Leave Answer
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

var ChordLeaveType = {
  invalidChordLeaveType: 0,
  from_succ: 1,
  from_pred: 2
};

module.exports = class LeaveRequest extends Content {
  constructor(type) {
    super();
    this.message_code = 0x11;
    if(!type)
      throw('Invalid type');
    this.message_body.type = type;
    this.message_body.id = global.nodeID[0].id;
    this.message_body.overlaySpecific = {};
    if(type == 1) //succ
    {
      this.message_body.overlaySpecific.from_succ = JSON.stringify(Array.from(global.topology.routing.successors));
    }
    if(type == 2)
    {
      this.message_body.overlaySpecific.from_pred = JSON.stringify(Array.from(global.topology.routing.predecessors));
    }
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeUInt8(this.message_body.type);
    buffer.writeStringNT(this.message_body.id);
    if(this.message_body.type == 1) //successors
      buffer.writeStringNT(this.message_body.overlaySpecific.from_succ);
    else if(this.message_body.type == 2) //predecessors
      buffer.writeStringNT(this.message_body.overlaySpecific.from_pred);
    return buffer;
  }
  static deSerialize(buffer) {
    var type = buffer.readUInt8();
    var req = new LeaveRequest(type);
    req.message_body.id = buffer.readStringNT();
    if(req.message_body.type == 1) //succ
      req.message_body.overlaySpecific.from_succ = JSON.parse(buffer.readStringNT());
    else if(req.message_body.type == 2)
      req.message_body.overlaySpecific.from_pred = JSON.parse(buffer.readStringNT());
    return {buffer: buffer, data: req};
  }
}
