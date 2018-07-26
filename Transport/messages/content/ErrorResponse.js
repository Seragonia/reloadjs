'use strict';
/**
  * Message content for Join Answer
  */
const Content     = require('./Content.js');
const MessageCode = require('../message.js').MessageCode;

//RFC6940 p.157
//See p.54 for details
var ErrorCode = Object.freeze({
 invalidErrorCode: 0x0,
 Unassigned: 0x1,
 Error_Forbidden: 0x2,
 Error_Not_Found: 0x3,
 Error_Request_Timeout: 0x4,
 Error_Generation_Counter_Too_Low: 0x5,
 Error_Incompatible_with_Overlay: 0x6,
 Error_Unsupported_Forwarding_Option: 0x7,
 Error_Data_Too_Large: 0x8,
 Error_Data_Too_Old: 0x9,
 Error_TTL_Exceeded: 0xA,
 Error_Message_Too_Large: 0xB,
 Error_Unknown_Kind: 0xC,
 Error_Unknown_Extension: 0xD,
 Error_Response_Too_Large: 0xE,
 Error_Config_Too_Old: 0xF,
 Error_Config_Too_New: 0x10,
 Error_In_Progress: 0x11,
 //!! For experimentation, do not use in operational deployments
 Error_Exp_A: 0x12,
 Error_Exp_B: 0x13,
 //!!
 Error_Invalid_Message: 0x14
});
module.exports.ErrorCode = ErrorCode;

module.exports = class ErrorResponse extends Content {
  constructor(type, info, code = 0xFFFF) {
    super();
    this.message_code = code; //error code
    this.message_body.errorType = type;
    this.message_body.errorInfo = info;
  }
  isAnswer() {
    return true;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.message_code);
    buffer.writeUInt8(this.message_body.errorType);
    buffer.writeStringNT(this.message_body.errorInfo);
    return buffer;
  }
  deserialize(buffer) {
    var message_code = buffer.readUInt8();
    var errorType = buffer.readUInt8();
    var errorInfo = buffer.readStringNT();
    return { data: new ErrorResponse(errorType, errorInfo, message_code), buffer: buffer };
  }
}
