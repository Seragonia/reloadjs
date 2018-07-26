'use strict';
/**
  * Returns a new object for the given content type
  */
const MessageCode = require('../message.js').MessageCode;

//TODO : add all classes objects
const JoinAnswer  = require('./JoinAnswer.js');
const JoinRequest = require('./JoinRequest.js');
const UpdateAnswer  = require('./UpdateAnswer.js');
const UpdateRequest = require('./UpdateRequest.js');
const ErrorResponse = require('./ErrorResponse.js');
const AttachMessage = require('./AttachMessage.js').AttachMessage;
const LeaveRequest  = require('./LeaveRequest.js');
const LeaveAnswer  = require('./LeaveAnswer.js');
const PingRequest  = require('./PingRequest.js');
const PingAnswer  = require('./PingAnswer.js');

//Map used to dynamically create a new object with a given code
const mapMessageType = {
  0x3: AttachMessage, //AttachRequest,
  0x4: AttachMessage, //AttachAnswer,
  0xF: JoinRequest,
  0x10: JoinAnswer,
  0x11: LeaveRequest,
  0x12: LeaveAnswer,
  0x13: UpdateRequest,
  0x14: UpdateAnswer,
  0x17: PingRequest,
  0x18: PingAnswer,
  0xFFFF: ErrorResponse,
  getDecoder(code) {
    return this[code].deSerialize;
  }
};
exports.Types = mapMessageType;

exports.ContentType = class ContentType {
  constructor() {}

  static getContentObject(code)
  {
    return new mapMessageType[code]();
  }

  static getContentType(code)
  {
    for(var key in MessageCode)
    {
      if(MessageCode[key] == code)
      {
        return key;
      }
    }
    return MessageCode.invalidMessageCode;
  }
  static getDecoder(code) {
    if(code == 3) {
      return mapMessageType[code].deSerializeRequest;
    }
    else if(code == 4)
      return mapMessageType[code].deSerializeAnswer;
    else {
      return mapMessageType[code].deSerialize;
    }
  }
}
