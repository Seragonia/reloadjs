'use strict';

const CertificateType = {
    X509: 0x0
};

exports.GenericCertificate = class GenericCertificate {
  constructor(certificate, type = CertificateType.X509) {
    this.type = CertificateType.X509;
    this.certificate = certificate;
  }
  verify(key) {
    //TODO verify certificate with key
  }
  getPublicKey() {
    //TODO get public key
  }
  serialize(buf) {
    buf.writeUInt8(this.code);
    //TODO encode certificate
    return buf;
  }
  deSerialize(buf) {
    var code = buf.readUInt8();
    var certificate = null; //TODO
    return { data: new exports.GenericCertificate(certificate, null), buffer: buf };
  }
}
