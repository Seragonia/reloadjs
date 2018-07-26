'use strict';

const CertHashSignerIdentityValue = require('./CertHashSignerIdentityValue.js').CertHashSignerIdentityValue;
const CertHashNodeIdSignerIdentityValue = require('./CertHashNodeIdSignerIdentityValue.js').CertHashNodeIdSignerIdentityValue;
const NoneSignerIdentityValue = require('./NoneSignerIdentityValue.js');;

//See
// http://www.iana.org/assignements/tls-parameters/tls-parameters.xml
var SignerIdentityType = {
  value: 0,
  'cert_hash':         { code: 1, class: CertHashSignerIdentityValue },
  'cert_hash_node_id': { code: 2, class: CertHashNodeIdSignerIdentityValue },
  'none':              { code: 3, class: NoneSignerIdentityValue },
  valueOf: function(code) {
    switch(code) {
      case 1:
        return 'cert_hash';
      case 2:
        return 'cert_hash_node_id';
      case 3:
        return 'none';
    }
  }
};

exports.SignerIdentityType = SignerIdentityType;

exports.SignerIdentity = class SignerIdentity {
  constructor(idType, idValue) {
    this.identityType = idType;
    this.signerIdentityValue = idValue;
  }
  /**
   * Identity for peers using only one NodeID
   */
  static singleIdIdentity(hashAlgorithm, signerCertificate) {
    var IdentityType = SignerIdentityType;
    IdentityType.value = 'cert_hash';
    var certHash = new CertHashSignerIdentityValue();
    return new exports.SignerIdentity(IdentityType.value, certHash.createWithCertificate(hashAlgorithm, signerCertificate));
  }
  static multipleIdidentity(hashAlgorithm, signerCertificate, signerNodeId)
  {
    var identityType = SignerIdentityType;
    identityType.value = 'cert_hash_node_id';
    return new exports.SignerIdentity(identityType, new CertHashNodeIdSignerIdentityValue(hashAlgorithm, signerCertificate));
  }
  static serialize(identity, buf) {
    buf.writeUInt8(SignerIdentityType[identity.identityType].code);
    if(identity.identityType == 'cert_hash')
      buf = CertHashSignerIdentityValue.serialize(identity.signerIdentityValue, buf);
    else if(identity.identityType == 'cert_hash_node_id')
      buf = CertHashNodeIdSignerIdentityValue.serialize(identity.signerIdentityValue, buf);
    return buf;
  }
  static deSerialize(buf) {
    var identityType = SignerIdentityType;
    identityType.value = SignerIdentityType.valueOf(buf.readUInt8());
    var ret = SignerIdentityType[identityType.value].class.deSerialize(buf);
    var signerIdentityValue = ret.data;
    buf = ret.buffer;
    return { data: new exports.SignerIdentity(identityType, signerIdentityValue), buffer: buf };
  }
}
