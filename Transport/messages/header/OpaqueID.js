'use strict';

module.exports = class OpaqueID {
  constructor(id) {
     this.id = id;
     this.destinationType = 0x3;
  }
  static getRoutableID(id) {
    return new OpaqueID(id);
  }
  getType() {
    return 0x3;
  }
  static decompress() {
    throw('OpaqueID are currently not implemented.');
  }
  serialize(buffer) {
    buffer.writeUInt8(this.getType());
    buffer.writeStringNT(this.id);
    return buffer;
  }
  deserialize() {
  }
}
