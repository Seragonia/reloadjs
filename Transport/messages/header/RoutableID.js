'use strict';
/**
  * A routable ID is an identifier that can be used as destination address for
  * the routing algorithm
  */
const bigInt = require('big-integer');
const NodeID = require('./NodeID.js');
const ResourceID = require('./ResourceID.js');
const OpaqueID = require('./OpaqueID.js');

var DestinationType = {
  NODEID: 0x1,
  RESOURCEID: 0x2,
  OPAQUEID: 0x3
};

module.exports.DestinationType = DestinationType;

module.exports.RoutableID = class RoutableID {
  constructor(id) {
    this.id = id;
    this.destinationType = null;
  }
  getDestinationType() {
    return this.destinationType;
  }
  setDestinationType(t) {
    this.destinationType = t;
  }
  compareTo(routableID) {
    return this.id.compare(routableID.id);
  }
  equals(obj) {
    if(!obj) return false;
    if(obj === this || obj == this) return true;
    if(!obj.id) return false;
    if(this.id.equals(obj.id)) return true;
    return false;
  }
  toString() {
    return this.id.toString();
  }
  isWildcard() {
    return (this.destinationType == DestinationType.NODEID) && (this.id.equals(bigInt.zero)) ? true : false;
  }
  static deSerialize(buffer) {
    var type = buffer.readUInt8();
    
    var id = buffer.readStringNT();
    switch(type)
    {
      case 1:
        //NodeID
        return {data: new NodeID(id), buffer: buffer};
        break;
      case 2:
        //ResourceID
        return {data: new ResourceID(id), buffer: buffer};
        break;
      case 3 :
        //OpaqueID
        return {data: new OpaqueID(id), buffer: buffer};
        break;
      default:
        throw('Invalid ID detected.');
    }
  }
};
