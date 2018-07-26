'use strict';

const crypto = require('crypto');
const SignerIdentity = require('./SignerIdentity.js').SignerIdentity;
const HashAlgorithm = require('./HashAlgorithm.js').HashAlgorithm;
const SignatureAlgorithm = require('./SignatureAlgorithm.js').SignatureAlgorithm;
const SignerIdentityType = require('./SignerIdentity.js').SignerIdentityType;

//Type of certificate. Only X.509 is supported
var CertificateType = Object.freeze({
  X509: 0,
  PGP:  1
});

//See [RFC5246] p.46
module.exports.SignatureAndHashAlgorithm = class SignatureAndHashAlgorithm {
  constructor(hash, signature) {
    this.HashAlgorithm      = hash;
    this.SignatureAlgorithm = signature;
  }
};

module.exports.Signature = class Signature {
  constructor(signerIdentity, hashAlg, signAlg, digest) {
      this.signAlg = signAlg;
      this.hashAlg = hashAlg;
      this.signerIdentity = signerIdentity;
      this.digest = digest;
  }
  /**
   * Verify the current signature over the passed data.
   * The signer identity will be automatically added
   * to the given data before signature.
   */
  verify(buf, publicKey) {
    var signer = crypto.createVerify(this.hashAlg);
    verify.update(buf.toBuffer());
    //TODO SignerIdentity!!!!
    signer = addSignerIdentity(signer);
    return verify.verify(publicKey, this.digest);
  }
  addSignerIdentity() {
    //TODO
  }

  static serialize(signature, buf) {
    buf.writeUInt8(HashAlgorithm[signature.hashAlg]);
    buf.writeUInt8(SignatureAlgorithm[signature.signAlg]);
    buf = SignerIdentity.serialize(signature.signerIdentity, buf);
    buf.writeUInt16BE(signature.digest.length);
    buf.writeBuffer(signature.digest);
    return buf;
  }
  static deSerialize(buf) {
    var hashAlg = HashAlgorithm.valueOf(buf.readUInt8());
    var signAlg = SignatureAlgorithm.valueOf(buf.readUInt8());
    var signerIdentityDecoded = SignerIdentity.deSerialize(buf);
    buf = signerIdentityDecoded.buffer;
    var signerIdentity = signerIdentityDecoded.data;
    var size = buf.readUInt16BE();
    var digest = buf.readBuffer(size);
    return new Signature(signerIdentity, hashAlg, signAlg, digest);
  }
  static verify() {}
}
