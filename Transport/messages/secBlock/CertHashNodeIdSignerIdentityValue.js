'use strict';

const crypto = require('crypto');
const HashAlgorithm = require('./HashAlgorithm.js').HashAlgorithm;

exports.CertHashNodeIdSignerIdentityValue = class CertHashNodeIdSignerIdentityValue {
  constructor() {
  }
  createWithHash(hashAlgorithm, certHash) {
    this.certHashAlg = hashAlgorithm;
    this.certHash = certHash;
  }
  createWithCertificate(hashAlgorithm, certif, nodeID) {
    this.certHashAlg = hashAlgorithm;
    this.certHash = computeHash(certif, nodeID);
  }
  computeHash(certif, nodeID) {
    var hash = crypto.createHash(this.certHashAlg.name);
    hash.update(nodeID);
    hash.update(certif);
    this.certHash = hash.digest('hex');
  }
  static serialize(identity, buf) {
    buf.writeUInt8(HashAlgorithm[identity.certHashAlg]);
    buf.writeStringNT(identity.certHash);
    return buf;
  }
  static deSerialize(buf) {
    var hashAlg = HashAlgorithm.valueOf(buf.readUInt8());
    if(hashAlg == null) throw('Unsupported hash algorithm');
    var certHash = crypto.createHash(hashAlg).update(buf.readStringNT()).digest('hex');
    var certHashNodeId = new exports.CertHashNodeIdSignerIdentityValue();
    certHashNodeId.createWithHash(hashAlg, certHash);
    return { data: certHashNodeId, buffer: buf };
  }
}
