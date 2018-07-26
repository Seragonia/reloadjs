'use strict';

const crypto = require('crypto');
const HashAlgorithm = require('../Transport/messages/secBlock/HashAlgorithm.js').HashAlgorithm;
const SignerIdentity = require('../Transport/messages/secBlock/SignerIdentity.js').SignerIdentity;
const NodeID = require('../Transport/messages/header/NodeID.js');
const CertHashSignerIdentityValue = require('../Transport/messages/secBlock/CertHashSignerIdentityValue.js').CertHashSignerIdentityValue;
const LoadCertificate = require('./X509Utils.js').loadCertificate;
const pki = require('node-forge').pki;
/**
 * Class that provides the cryptographic functionalities for the local node
 */
module.exports.Keystore = class Keystore {
  constructor(localCert, localPrivateKey) {
    this.storedCert = [];
    this.localCert = pki.certificateFromPem(localCert.cert);
    this.localKey = localPrivateKey;
    this.addCertificate(localCert);
  }
  addCertificate(/*ReloadCertificate*/ cert) {
    this.storedCert[''+cert.getNodeId()] = cert;
  }
  removeCertificate(nodeID) {
    delete this.storedCert[nodeID];
  }
  getCertificate(nodeID)
  {
    if(this.storedCert[nodeID])
      return this.storedCert[nodeID];
    return null;
  }
  getStoredCertificates() {
    return this.storedCert;
  }
  getLocalCert() {
    return this.localCert;
  }
  getLocalKey() {
    return this.localKey;
  }
}
