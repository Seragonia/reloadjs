'use strict';

const sha1                   = require('node-forge').md.sha1;
const NodeID                 = require('./header/NodeID.js');
const SmartBuffer            = require('smart-buffer').SmartBuffer;
const DestinationList        = require('./header/DestinationList.js').DestinationList;
const ForwardingOption       = require('./header/ForwardingOption.js').ForwardingOption;
const FRAGMENT_INITIAL_VALUE = 0x8000;
const LAST_FRAGMENT_MASK     = 0x4000;
/**
  * RELOAD Message builder class
  */
exports.Header = class Header {
  constructor() { }
  create(instance) {
    this.overlayHash = 0x4; //Only sha256 currently supported
    this.isLastFragment = true;
    //RELOAD message identifier
    this.relo_token = 0xd2454c4f;
    //32bit from the lower 32bits of the overlay name's sha-1 hash
    var sha = sha1.create();
    sha = sha.update(instance.instanceName, 'utf8').digest().toHex().substring(sha.length - 32);
    this.overlay = sha;
    this.configuration_sequence = instance.sequence;
    this.version = 0x0a;
    this.ttl = instance["initial-ttl"];
    this.fragmentHeadValue = FRAGMENT_INITIAL_VALUE;
    this.fragmentOffset = 0;
    this.length = 0;
    this.transaction = Math.floor(Math.random() * Math.floor(4294967296));
    this.max_response_length = instance.config["max-message-size"];
    this.via_list_length = 0;
    this.destination_list_length = 0;
    this.options_length = 0;
    this.via_list = new DestinationList();
    //this.via_list.list.push(global.nodeID[0]); via list grows when the message is routed
    this.destination_list = new DestinationList();
    this.options = new ForwardingOption();
  }
  //addToViaList à faire pour ajouter à la via list un nodeid
  addToViaList(nodeid) {
    this.via_list.list.push(new NodeID(nodeid));
  }
  serialize(buffer) {
    buffer.writeUInt32BE(this.relo_token);
    buffer.writeStringNT(this.overlay);
    buffer.writeStringNT(this.configuration_sequence);
    buffer.writeUInt8(this.version);
    buffer.writeUInt8(this.ttl);
    buffer.writeUInt16BE(this.fragmentHeadValue); //TODO handle message fragment
    buffer.writeUInt16BE(this.fragmentOffset); //TODO handle message fragment
    //Allocate space for message length //TODO fill this value
    buffer.writeUInt32BE(0);
    //Write the transaction number (64bits in the RFC but not possible
    //in JS, so we use 32bits instead)
    buffer.writeUInt32BE(this.transaction);
    buffer.writeUInt32BE(this.max_response_length);
    var offset = buffer.length;
    buffer.writeUInt16BE(0);//this.via_list_length);
    buffer.writeUInt16BE(0);//this.destination_list_length);
    buffer.writeUInt16BE(0);//this.options_length);
    var l0 = buffer.length;
    buffer = this.via_list.serialize(buffer);
    var l1 = buffer.length-l0;
    buffer = this.destination_list.serialize(buffer);
    var l2 = buffer.length-l1-l0;
    buffer = this.options.serialize(buffer);
    var l3 = buffer.length-l2-l1-l0;
    //Write length of each part
    buffer.writeUInt16BE(l1, offset);
    buffer.writeUInt16BE(l2, offset+2);
    buffer.writeUInt16BE(l3, offset+4);
    return buffer;
  }
  static deSerialize(buf) {
    var b = SmartBuffer.fromBuffer(Buffer.from(buf));
    var h = new exports.HeaderBuilder();
    h.setRelo_token(b.readUInt32BE());
    h.header.overlay = b.readStringNT();
    h.setConfigurationSequence(b.readStringNT());
    h.setVersion(b.readUInt8(this.version));
    h.setTtl(b.readUInt8(this.ttl));
    h.setFragmentHeadValue(b.readUInt16BE(this.fragmentHeadValue));
    h.setFragmentOffset(b.readUInt16BE(this.fragmentOffset));
    h.setLength(b.readUInt32BE());
    h.setTransaction(b.readUInt32BE());
    h.setMaxResponseLength(b.readUInt32BE());
    h.setViaListLength(b.readUInt16BE());
    h.setDestinationListlength(b.readUInt16BE());
    h.setOptionsLength(b.readUInt16BE());
    var vialist = DestinationList.deSerialize(b, h.header.via_list_length);
    h.setViaList(vialist.data);
    b = vialist.buffer;
    var destList = DestinationList.deSerialize(b, h.header.destination_list_length);
    h.setDestinationList(destList.data);
    b = destList.buffer;
    h.setOptions(ForwardingOption.deSerialize(b, h.header.options_length));
    //TODO : read each list
    //readBuffer to get each one, and deserialize them using the
    return { data: h.header, buffer: b };
  }
  getNextHop() {
    return this.destination_list.list[0];
  }
  getPreviousHop() {
    return this.via_list.list[0];
  }
  getDestinationId() {
    if(!this.destination_list.list.length) throw ('Empty Destination list.');
    return this.destination_list.list[this.destination_list.list.length -1];
  }
  toForward(lastHop) {
    this.ttl -= 1;
    if(!this.via_list.getDestination().id == lastHop.id)
    {
      this.via_list.push(lastHop);
    }
    if(this.destination_list.length > 1) {
      this.destination_list.shift();
    }
    this.via_list.addEnd(new NodeID(global.nodeID[0].id));
  }
}

exports.HeaderBuilder = class HeaderBuilder {
  constructor() {
    this.header = new exports.Header();
  }
  create(instance) {
    this.header.create(instance);
  }
  setRelo_token(token) {
    this.header.relo_token = token;
  }
  setConfigurationSequence(s) {
    this.header.configuration_sequence = s;
  }
  setVersion(v) {
    this.header.version = v;
  }
  setTtl(t) {
    this.header.ttl = t;
  }
  setFragmentHeadValue(f) {
    this.header.fragmentHeadValue = f;
  }
  setFragmentOffset(f) {
    this.header.fragmentOffset = f;
  }
  setLength(l) {
    this.header.length = l;
  }
  setTransaction(t) {
    this.header.transaction = t
  }
  setMaxResponseLength(mrl) {
    this.header.max_response_length = mrl;
  }
  setViaListLength(vll) {
    this.header.via_list_length = vll;
  }
  setDestinationListlength(dll) {
    this.header.destination_list_length = dll;
  }
  setOptionsLength(ol) {
    this.header.options_length = ol;
  }
  setDestinationList(d) {
    var dest = new DestinationList();
    dest.setList(d);
    this.header.destination_list = dest;
  }
  setViaList(via) {
    var v = new DestinationList();
    v.setList(via);
    this.header.via_list = v;
  }
  setOptions(o) {
    this.header.options = o;
  }
  build() {
    return this.header;
  }
}
