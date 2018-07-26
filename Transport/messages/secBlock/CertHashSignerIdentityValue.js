'use strict';

const crypto = require('crypto');
const HashAlgorithm = require('./HashAlgorithm.js').HashAlgorithm;

exports.CertHashSignerIdentityValue = class CertHashSignerIdentityValue {
  constructor() {
  }
  createWithHash(hashAlgorithm, certHash) {
    this.certHashAlg = hashAlgorithm;
    this.certHash = certHash;
    return this;
  }
  createWithCertificate(hashAlgorithm, certif) {
    this.certHashAlg = hashAlgorithm;
    this.certHash = this.computeHash(certif);
    return this;
  }
  computeHash(certif) {
    var hash = crypto.createHash(this.certHashAlg);
    hash.update(certif.cert);
    return hash.digest('hex');
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
    var certHashNodeId = new exports.CertHashSignerIdentityValue();
    certHashNodeId.createWithHash(hashAlg, certHash);
    return { data: certHashNodeId, buffer: buf };
  }
}
