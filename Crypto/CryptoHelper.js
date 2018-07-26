'use strict';

const crypto = require('crypto');
const HashAlgorithm = require('../Transport/messages/secBlock/HashAlgorithm.js').HashAlgorithm;
const SignerIdentity = require('../Transport/messages/secBlock/SignerIdentity.js').SignerIdentity;
const Signer = require('./Signer.js').Signer;
const pki = require('node-forge').pki;

/**
 * Class that provides the cryptographic functionalities for the local node
 */
module.exports.CryptoHelper = class CryptoHelper {
  constructor(keystore, conf, signHashAlg, signAlg, certHashAlg) {
    this.keystore = keystore;
    this.conf = conf;
    this.signHashAlg = signHashAlg;
    this.signAlg = signAlg;
    this.certHashAlg = certHashAlg;
    this.hashAlgorithm = 'SHA1';
  }
  newSigner() {
    var signerIdentity = SignerIdentity.singleIdIdentity(this.signAlg, global.localCertificate);
    var signer = new Signer(signerIdentity, global.localPrivateKey, this.hashAlgorithm, this.signHashAlg);
    return signer;
  }
  newSignerVerify(key, cert) {
    var signerIdentity = SignerIdentity.singleIdIdentity(this.signAlg, cert);
    var signer = new Signer(signerIdentity, key, this.hashAlgorithm, this.signHashAlg);
    return signer;
  }
  getLocalTrustRelationship() {
    var issuers = global.conf["root-cert"];
    var relations = null;
    var out = [];
    /*
    NOT implemented : case of signed certificate with CA
    for(var issuer in issuers)
    {
      try {
        relations = this.getTrustRelationship(global.localCertificate, issuer, issuers);
        if (relations != null) {
					//relations.remove(issuer);
          //TODO: delete issuer
					return relations;
				}
      } catch(err) {
        throw('Trust relation for local peer not found.');
      }
    }*/
    out.push(global.localCertificate.cert);
    return out;
  }
  getTrustRelationship(peerCert, trustedIssuer, listCert) {
      var out = [];
      var x509PeerCert = pki.certificateFromPem(peerCert.cert);
      /*
      NOT implemented : case of signed certificate with CA
      while(true) {
        var issuer = x509PeerCert.issuer;
        var match = this.getMatchingCertificate(issuer, listCert);
        console.log(match);
        if (match == null)
  				throw("Certificate not found for issuer: [" + issuer + "]");

        Verify the peerCert with the issuerPublicKey
        peerCert.verify(issuerCert.getPublicKey());
        out.push(x509PeerCert);
        if (trustedIssuer.equals(issuerCert)) {
          break;
        }
        x509PeerCert = match;
      }
      */
      out.push(trustedIssuer);
      return out;
  }
  getMatchingCertificate(issuer, listCert) {
    //Returns the list of certificates that have the same issuer

    for(var cert in listCert)
    {
      if(listCert[cert].issuer.getField('CN').value != issuer.getField('CN').value)
        continue;
      if(listCert[cert].issuer.getField('C').value != issuer.getField('C').value)
        continue;
      if(listCert[cert].issuer.getField('ST').value != issuer.getField('ST').value)
        continue;
      if(listCert[cert].issuer.getField('L').value != issuer.getField('L').value)
        continue;
      if(listCert[cert].issuer.getField('O').value != issuer.getField('O').value)
        continue;
      var x509Cert = listCert[cert];
      return x509Cert;
    }
    return null;
  }
}
