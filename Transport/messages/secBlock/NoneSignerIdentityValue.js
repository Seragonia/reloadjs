'use strict';

exports.None = class NoneSignerIdentityValue {
  constructor() {
  }
  static serialize(buf) {
    return buf;
  }
  static deSerialize(buf) {
    return { data: new exports.CertHashNodeIdSignerIdentityValue(), buffer: buf };
  }
}
