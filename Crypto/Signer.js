'use strict';

const crypto = require('crypto');
const Signature = require('../Transport/messages/secBlock/Signature.js').Signature;
const out = require('../utils/reloadTraces.js');
const SignerIdentity = require('../Transport/messages/secBlock/SignerIdentity.js').SignerIdentity;
const SmartBuffer = require('smart-buffer').SmartBuffer;

module.exports.Signer = class Signer {
  constructor(signerIdentity, privateKey, hashAlg, signAlg) {
    this.identity = signerIdentity;
    this.hashAlg = hashAlg;
    this.signAlg = signAlg;
    this.key = privateKey;
    this.signer = crypto.createSign(signAlg+'-'+hashAlg); //RSA-SHA1
  }
  update(b) {
    this.signer.update(b);
  }
  sign() {
    this.addSignerIdentity(this.signer);
    var digest = this.signer.sign(this.key);
    return new Signature(this.identity, this.hashAlg, this.signAlg, digest);
  }
  verify(signature, buffer) {
    var signerIdentity = new SmartBuffer();
    signerIdentity = SignerIdentity.serialize(this.identity, signerIdentity);
    this.addSignerIdentity(this.signer);
    var verify = crypto.createVerify(this.signAlg+'-'+this.hashAlg);
    verify.update(buffer);
    verify.update(signerIdentity.toBuffer());
    return verify.verify(this.key, signature);
  }
  addSignerIdentity(signer) {
    var buf = new SmartBuffer();
    buf = SignerIdentity.serialize(this.identity, buf);
    this.signer.update(buf.toBuffer());
  }
  getIdentity() {
    return this.identity;
  }
  getSignAlgorithm() {
    return this.signAlg;
  }
  getHashAlgorithm() {
    return this.hashAlg;
  }
}
