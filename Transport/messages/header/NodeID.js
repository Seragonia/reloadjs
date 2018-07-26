'use strict';

module.exports = class NodeID {
  constructor(id) {
     this.id = id;
     this.destinationType = 0x1;
  }
  static getNodeID(id) {
    return new NodeID(id);
  }
  getType() {
    return 0x1;
  }
  serialize(buffer) {
    buffer.writeUInt8(this.getType());
    buffer.writeStringNT(this.id);
    return buffer;
  }
  deserialize() {

  }
}
