'use strict';
/**
  * Encode and decode Message object to / from Byte Buffers
  */
module.exports = class EncoderDecoder {
  constructor(MaxMessageSize = 5000 /*default*/) {
    this.data = new Buffer.alloc(MaxMessageSize);
    this.offset = 0;
  }
  encode(data) {
    //Mother's method to encode data in the buffer
    //this.data.length
  }
  decode(data) {

  }

  writeField(length, data)
  {

  }
  computeSecurityBlock()
  {
    //return new SecurityBlock(...)
  }
}
