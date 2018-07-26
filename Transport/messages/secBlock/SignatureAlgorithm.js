'use strict';

//TLS SignatureAlgorithm Registry
// Reference [RFC5246]
// Range Registration Procedures
// 0-63 Standards Action
// 64-223 Secification Required
// 224-255 reserved for Private Use
// Encoded in byte
var SignatureAlgorithm = Object.freeze({
  'ANONYMOUS': 0x0,
  'RSA':       0x1,
  'DSA':       0x2,
  'ECDSA':     0x3,
  valueOf: function(value) {
    switch(value)
    {
      case 0:
        return 'ANONYMOUS';
      case 1:
        return 'RSA';
      case 2:
        return 'DSA';
      case 3:
        return 'ECDSA';
      default:
        return null;
    }
  },
  serialize: function(sign, buf) {
    buf.writeUInt8(sign.code);
    return buf;
  },
  deSerialize: function(buf) {
    var signAlg = {};
    signAlg.code = buf.readUInt8();
    return signAlg;
  }
});

exports.SignatureAlgorithm = SignatureAlgorithm;
