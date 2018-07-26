'use strict';

//hash algorithms, see
//http://www.iana.org/assignements/tls-parameters/tls-parameters.xml
var HashAlgorithm = {
  'name': '',
  'NODE':   0x0,
  'MD5':    0x1,
  'SHA1':   0x2,
  'SHA224': 0x3,
  'SHA256': 0x4,
  'SHA384': 0x5,
  'SHA512': 0x6,
  valueOf: function(value) {
    switch(value)
    {
      case 0:
        return 'node';
      case 1:
        return 'MD5';
      case 2:
        return 'SHA1';
      case 3:
        return 'SHA224';
      case 4:
        return 'SHA256';
      case 5:
        return 'SHA384';
      case 6:
        return 'SHA512';
      default:
        return null;
    }
  },
  serialize: function(hashAlg, buf) {
    buf.writeUInt8(hashAlg.code);
    return buf;
  },
  deSerialize: function(buf) {
    var HashAlgorithm = {};
    HashAlgorithm.code = buf.readUInt8();
    if(HashAlgorithm.code < 0 || HashAlgorithm.code > 6) throw('Unsupported hash algorithm');
    return { data: HashAlgorithm, buffer: buf };
  }
};

exports.HashAlgorithm = HashAlgorithm;
