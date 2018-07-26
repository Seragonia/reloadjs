'use strict';

const SmartBuffer = require('smart-buffer').SmartBuffer;
const MessageEncoder = require('./MessageEncoder.js');

/**
  * RELOAD Message class
  */

//RFC6940 p.156
var MessageCode = Object.freeze({
  invalidMessageCode: 0x0,
  probe_req: 0x1,
  probe_ans: 0x2,
  attach_req: 0x3,
  attach_ans: 0x4,
  store_req: 0x7,
  store_ans: 0x8,
  fetch_req: 0x9,
  fetch_ans: 0xA,
  find_req: 0xD,
  find_ans: 0xE,
  join_req: 0xF,
  join_ans: 0x10,
  leave_req: 0x11,
  leave_ans: 0x12,
  update_req: 0x13,
  update_ans: 0x14,
  route_query_req: 0x15,
  route_query_ans: 0x16,
  ping_req: 0x17,
  ping_ans: 0x18,
  stat_req: 0x19,
  stat_ans: 0x1A,
  app_attach_req: 0x1D,
  app_attach_ans: 0x1E,
  config_update_req: 0x21,
  config_update_ans: 0x22,
  //!! For experimentation, do not use in operational deployments
  exp_a_req: 0x23,
  exp_a_ans: 0x24,
  exp_b_req: 0x25,
  exp_b_ans: 0x26,
  //!!
  error: 0xFFFF
});

//RFC6940 p.158
var OverlayLinkTypes = Object.freeze({
  INVALID_PROTOCOL: 0,
  DTLS_UDP_SR: 1,
  DTLS_UDP_SR_NO_ICE: 3,
  TLS_TCP_FH_NO_ICE: 4,
  //!! For experimentation, do not use in operational deployments
  EXP_LINK: 5,
  //!!
  Reserved: 255
});

//RFC6940 p.158
var OverlayLinkProtocol = Object.freeze({
  TLS: 0,
  //!! For experimentation, do not use in operational deployments
  EXP_PROTOCOL: 1
  //!!
});

var ChordUpdateType = Object.freeze({
  invalidChordUpdateType: 0,
  peer_ready: 1, //ready to receive message
  neighbors: 2,
  full: 3
});

//RFC 6940 p.116
var ChordUpdateMessage = {
  uptime: 0, //time peer has been up in seconds
  ChordUpdateType: null,
  predecessors: [], //if type == neighbor or full
  successors: [], //if type == neighbor or full
  fingers: [], //if type == full
};


//RFC6940 p.160
var MessageExtensionTypes = Object.freeze({
  invalidMessageExtensionType: 0x0,
  //!! For experimentation, do not use in operational deployments
  exp_ext: 0x1,
  //!!
  reserved: 0xFFFF
});

var NodeState = Object.freeze({
  unknown: 0,
  attaching: 1,
  attached: 2,
  updates_received: 3
});

var AttachOption = Object.freeze({
  standard: 1,
  forceupdate: 2,
  sendping: 4
});

var PingOption = Object.freeze({
  standard: 1, //normal
  direct: 2,   //direct connection to destination
  force: 4,    //ignore current state of node
  finger: 8    //is a request by fix finger
});

var CertType = Object.freeze({
  x509: 0
});

var DestinationType = Object.freeze({
  node: 1,
  resource: 2,
  compressed: 3
});

module.exports.MessageCode           = MessageCode;
module.exports.OverlayLinkTypes      = OverlayLinkTypes;
module.exports.OverlayLinkProtocol   = OverlayLinkProtocol;
module.exports.ChordUpdateType       = ChordUpdateType;
module.exports.ChordUpdateMessage    = ChordUpdateMessage;
module.exports.MessageExtensionTypes = MessageExtensionTypes;
module.exports.NodeState             = NodeState;
module.exports.AttachOption          = AttachOption;
module.exports.PingOption            = PingOption;
module.exports.CertType              = CertType;
module.exports.DestinationType       = DestinationType;

module.exports.Message = class Message {
  constructor(header, content, secBlock) {
    this.header   = header;
    this.content  = content;
    this.secBlock = secBlock;
  }
  getHeader() {
    return this.header;
  }
  getContent() {
    return this.content;
  }
  getSecBlock() {
    return this.secBlock;
  }
  toString() {
    return ''+this.header+this.content+this.secBlock;
  }
  serialize() {
    //Buffer used to serialize a RELOAD message
    var buffer = new SmartBuffer();
    buffer = this.header.serialize(buffer);
    buffer = this.content.serialize(buffer);
    var encoder = new MessageEncoder();
    buffer = encoder.serialize(this, buffer);
    return buffer;
  }
}
