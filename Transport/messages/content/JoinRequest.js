'use strict';
/**
  * Message content for Join request
  */
const Content     = require('./Content.js');
const MessageType = require('../message.js').MessageCode;
const MAX_UINT16  = 0xFFFF;

module.exports = class JoinRequest extends Content {
  constructor(localNodeID) {
    super();
    this.message_code = 0xF;
    this.message_body.localNodeID = localNodeID;
  }
  getJoiningNode()
  {
    return this.localNodeID;
  }
  getOverlayData()
  {
    return this.overlayData;
  }
  getType()
  {
    return MessageType.join_req;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeStringNT(this.message_body.localNodeID.id);
    return buffer;
  }
  static deSerialize(buffer) {
    var id = buffer.readStringNT();
    return {buffer: buffer, data: new JoinRequest(id)};
  }
}
