'use strict';
/**
  * Structure used by Content.js to create the content part of a RELOAD message
  */
const MessageExtensionType = require('../message.js').MessageExtensionTypes;
const MAX_UINT32 = 4294967295;

module.exports = class MessageExtension {
  constructor() {
    //Default values
    this.messageExtensionType = MessageExtensionTypes.invalidMessageExtensionType;
    this.critical = false;
    this.extension_contents = new Buffer.alloc(MAX_UINT32);
  }
}
