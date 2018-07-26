'use strict';
/**
  * Security Block class (RELOAD Message)
  * A security block is made of :
  * {
  *   CertificateType type
  *   opaque certificate<...>
  * } GenericCertificate
  *
  * {
  *   GenericCertificate certificates<...>
  *   Signature signature
  * } SecurityBlock
  */

const pki = require('node-forge').pki;
const Signature = require('./Signature.js').Signature;

exports.SecurityBlock = class SecurityBlock {
  constructor(certificates, signature) {
    this.certificates = certificates;
    this.signature = signature;
  }
  static serialize(secBlock, buf) {
    buf.writeUInt8(secBlock.certificates.length);
    for(var cert in secBlock.certificates)
    {
      buf.writeStringNT(secBlock.certificates[cert].certificate);
    }
    buf = Signature.serialize(secBlock.signature, buf);
    return buf;
  }
  static deSerialize(buf) {
    var certs = [];
    var length = buf.readUInt8();
    for(var i = 0 ; i<length; i++)
    {
      certs.push(buf.readStringNT());
    }
    return { data: new exports.SecurityBlock(certs, Signature.deSerialize(buf)), buffer: buf };
  }

}
