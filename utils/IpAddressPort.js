'use strict';
/**
  * Represents an Ipv4 & Ipv6 address + port
  */

const AddressType = {
  IPv4: 0x0,
  IPv6: 0x1
};

module.exports = class IpAddressPort {
  constructor() {
    this.IPv4AddrPort = {
      addr: new Uint8Array(4), //address is a 4-uint8 array
      port: 0
    };
    this.IPv6AddrPort = {
      addr: Uint16Array(8), //address is a 8-uint16 array
      port: 0
    };
    this.type = AddressType.IPv4; //default
  }
}
