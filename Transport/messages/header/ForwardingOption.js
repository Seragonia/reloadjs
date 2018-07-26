"use strict";
const SmartBuffer = require('smart-buffer').SmartBuffer;

//Allows for unknown option types
const ForwardingOptionType = {
  UNKNOWN_TYPE: 0x0,
  setType: function(code) {
    this.type = code;
    return this;
  }
};

//RFC6940 p.159
var ProbeInformationTypes = Object.freeze({
  invalidProbeOption: 0,
  responsible_set: 1,
  num_resources: 2,
  uptime: 3,
  //!! For experimentation, do not use in operational deployments
  exp_probe: 4,
  //!!
  reserved: 255
});

/**
  * Forwarding Option contained in the message header
  */
exports.ForwardingOption = class ForwardingOption {
  constructor() {
    this.ForwardingOptionType = ForwardingOptionType.UNKNOWN_TYPE;
    this.isForwardCritical = false; //TODO
    this.isDestinationCritical = false;
    this.isResponseCopy = false;
  }
  serialize(buffer) {
    buffer.writeUInt16BE(Buffer.from([this.ForwardingOptionType]));
    var flags = 0;
    if(this.isForwardCritical)
      flags = 0x01;
    if(this.isDestinationCritical)
      flags |= 0x02;
    if(this.isResponseCopy)
      flags |= 0x04;
    buffer.writeUInt8(flags);
    //length is always null, no option is currently supported
    buffer.writeUInt16BE(0);
    return buffer;
  }
  static deSerialize(buf, len) {
    var f = new exports.ForwardingOption();
    this.ForwardingOptionType = buf.readUInt16BE();
    var flags = buf.readUInt8();
    f.isForwardCritical     = (flags & 0x01 == 1) ? true : false;
    f.isDestinationCritical = (flags & 0x02 == 1) ? true : false;
    f.isResponseCopy        = (flags & 0x04 == 1) ? true : false;
    //length is always null, no option is currently supported
    buf.readUInt16BE();
    return f;
  }
}
