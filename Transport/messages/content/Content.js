'use strict';
/**
  * Content abstract class (RELOAD Message)
  * A message contents is made of :
  * {
  *   uint16 messagecode
  *   opaque messageBody
  *   MessageExtension { //defined in messageExtension.js
  *     MessageExtensionType type,
  *     bool critical,
  *     opaque extension_contents
  *   }
  * }
  */
//const MessageTypes     = require('./ContentType.js').Types;
const MessageExtension = require('./messageExtension.js');
const MAX_UINT32       = 4294967295;

module.exports = class Content {
  constructor() {
    this.message_code = 0x0; //default
    this.message_body = {}; //buffer
    this.extensions = new Set(); //no extension are defined yet (p. 53)
    this.MAX_BODY_LENGTH = MAX_UINT32;
    this.MAX_EXTENSION_LENGTH = MAX_UINT32;
  }
  appendMessageExtension(extension) {
    this.extensions.add(extension);
  }
  getMessageExtensions() {
    return this.extensions;
  }
  setMessage_code(code)
  {
    this.message_code = code;
  }
  /*
   * MessageBody is a structure associated to the message type
   */
  setMessage_body(msg) {
    this.message_body = msg;
  }
  /*
   * Used to get all the structure in a ByteBuffer
   */
  getContent() {
    var msg = this.toString();
    if(msg.length > MAX_UINT32) {
      throw('Invalid message length : too long.');
      return;
    }
    return Buffer.from(msg);
  }
  toString() {
    return ''
      +this.message_code
      +this.message_body.toString()
      +this.extensions.toString();
  }
  serialize(buf) {
  }
  static deSerialize(buf) {
    //Get content type
    //Call the right deserializer using a map
    //message_code
    var type = buf.readUInt8();
    var ret = global.ContentType.getDecoder(type);
    var result = ret(buf);
    return { data: result.data, buffer: result.buffer };
  }
}
