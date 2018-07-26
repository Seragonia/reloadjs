'use strict';
const out         = require('../../../utils/reloadTraces.js');
const BigInt      = require('big-integer');
const RoutableID  = require('./RoutableID.js').RoutableID;
const SmartBuffer = require('smart-buffer').SmartBuffer;

/*
 * A destinationList is a list of RELOAD peer through whose a RELOAD message
 * should be routed to arrive.
 */

exports.DestinationList = class DestinationList {
  constructor() {
    this.list = [];
  }
  setList(list) {
    this.list = Array.from(list);
  }
  setPosition(index, value) {
    this.list[index] = value;
  }
  addEnd(routableID) {
    this.list.push(routableID);
  }
  addToPosition(index, routableID)
  {
    this.list.splice(index, 0, routableID);
  }
  getDestination() {
    return this.list[this.list.length-1];
  }
  getIndex(index) {
    return this.list[index];
  }
  getSize() {
    return this.list.size;
  }
  removeAtIndex(index) {
    this.list = this.list.splice(index,1);
  }
  //Used to serialize the destination list
  serialize(buffer) {
    for(var i = 0; i<this.list.length; i++) {
      buffer = this.list[i].serialize(buffer);
    }
    return buffer;
  }
  static deSerialize(buf, len) {
    var maxlength = buf.readOffset + len;
    var list = [];
    while(buf.readOffset < maxlength)
    {
      var ret = RoutableID.deSerialize(buf);
      list.push(ret.data);
      buf = ret.buffer;
    }
    return {data: list, buffer: buf};
  }
}
