'use strict';

module.exports = class ResourceID {
  constructor(id) {
     this.id = id;
     this.destinationType = 0x2;
  }
  static getRoutableID(id) {
    return new RoutableID(id);
  }
  getType() {
    return 0x2;
  }
  //TODO
  serialize(buffer) {
    buffer.writeUInt8(this.getType());
    buffer.writeStringNT(this.id);
    return buffer;
  }
  deserialize() {
  }
}
