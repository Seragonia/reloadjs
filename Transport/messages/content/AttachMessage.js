'use strict';
/**
  * Attach requests and answers
  * used with ICE
  */
const MessageCode    = require('../message.js').MessageCode;
const Content        = require('./Content.js');
const SmartBuffer    = require('smart-buffer').SmartBuffer;


exports.AttachMessage = class AttachMessage extends Content {
  constructor(builder) {
    super();
    const UFRAG_LENGTH_FIELD = 255;
    const PASS_LENGTH_FIELD = 255;
    const ROLE_LENGTH_FIELD = 255;
    const CANDIDATES_LENGTH_FIELD = 65535;
    //Set message code
    this.message_code = 0x0;
    //Set message body
  /*  this.message_body.userFragment = '';
    this.message_body.password = '';*/
    this.message_body.candidates = [];
    this.message_body.sendUpdate = false;
  }
  create(builder) {
    //Set message code
    this.message_code = builder.contentType;
    //Set message body
    // this.message_body.userFragment = builder.userFragment;
    // this.message_body.password = builder.password;
    this.message_body.candidates = builder.candidates;
    // this.message_body.sendUpdAttachMessageate = builder.sendUpdate;
  }
  serialize(buffer) {
    /*buffer.writeUInt8(this.message_body.userFragment.length);
    buffer.writeBuffer(this.message_body.userFragment);

    buffer.writeUInt8(this.message_body.password.length);
    buffer.writeBuffer(this.message_body.password);

    var role = this.isRequest ? "active" : "passive";
    buffer.writeUInt8(role.length);
    buffer.writeStringNT(role);

    //Encode candidates
    //First save how many candidates there is
    buffer.writeUInt8(this.message_body.candidates.length);
    for(var key in this.message_body.candidates)
    {
      //Then append each candidate
    //  attachMsg.candidates[key].encode(attachMsg.candidates[key], buffer);
    }

    buffer.writeInt16BE(this.message_body.password.length);
    buffer.writeInt8(this.message_body.sendUpdate ? 1 : 0);*/
    //Only the SDP offer is sended (which correspond to the same schema)
    buffer.writeUInt8(this.message_code);
    buffer.writeStringNT(this.message_body.candidates);
    buffer.writeUInt8(this.message_body.sendUpdate);
    return buffer;
  }
  static deSerializeRequest(reader) {
    var b = new exports.AttachMessageBuilder();
    //let s = 0;
    /*s = reader.readUInt8();
    b.content.message_body.userFragment = reader.readBuffer(s);
    s = reader.readUInt8();
    b.content.message_body.password = reader.readBuffer(s);
    s = reader.readUInt8();
    var string = reader.readStringNT();
    if(string === "active")
      b.content.isRequest = true;
    else
      b.content.isRequest = false;
    //Get the number of ICE candidates
    s = reader.readUInt8();
    for(var i = 0; i<s; i++)
    {
    //  b.candidates.push( TODO : decode ICE candidate );
    }
    s = reader.readInt16BE();
    b.content.message_body.sendUpdate = reader.readInt8() == 1 ? true : false;
    //No options currently supported (RFC)*/
    b.content.message_code = 0x3;
    b.setCandidates(reader.readStringNT());
    b.content.message_body.sendUpdate = reader.readUInt8() == 1 ? true : false;
    return { data: b.buildRequest(), buffer: reader };
  }
  static deSerializeAnswer(reader) {
    var b = new exports.AttachMessageBuilder();
    //let s = 0;
    /*s = reader.readUInt8();
    b.content.message_body.userFragment = reader.readBuffer(s);
    s = reader.readUInt8();
    b.content.message_body.password = reader.readBuffer(s);
    s = reader.readUInt8();
    var string = reader.readStringNT();
    if(string === "active")
      b.content.isRequest = true;
    else
      b.content.isRequest = false;
    //Get the number of ICE candidates
    s = reader.readUInt8();
    for(var i = 0; i<s; i++)
    {
    //  b.candidates.push( TODO : decode ICE candidate );
    }
    s = reader.readInt16BE();
    b.content.message_body.sendUpdate = reader.readInt8() == 1 ? true : false;
    //No options currently supported (RFC)*/
    b.content.message_code = 0x4;
    b.setCandidates(reader.readStringNT());
    b.content.message_body.sendUpdate = reader.readUInt8() == 1 ? true : false;
    return { data: b.buildAnswer(), buffer: reader };
  }
}

exports.AttachMessageBuilder = class AttachMessageBuilder {
  constructor() {
    this.content = new exports.AttachMessage();
    this.content.message_body.userFragment = Buffer.from(''); //Buffer
    this.content.message_body.password = Buffer.from(''); ///Buffer
    this.content.message_body.candidates = [];
    this.content.message_body.sendUpdate = false;
  }
  setCandidates(c) {
    this.content.message_body.candidates = c;
    return this;
  }
  setPassword(pwd) {
    this.content.message_body.password = pwd;
    return this;
  }
  setUserFragment(uf) {
    this.content.message_body.userFragment = uf;
    return this;
  }
  setSendUpdate(bool) {
    this.content.message_body.sendUpdate = bool;
    return this;
  }
  buildRequest() {
    this.content.message_code = MessageCode.attach_req;
    this.content.isRequest = true;
    return this.content;
  }
  buildAnswer() {
    this.content.message_code = MessageCode.attach_ans;
    this.content.isRequest = false;
    return this.content;
  }
}
