'use strict';

const NodeID      = require('../Transport/messages/header/NodeID.js');
const asn1js      = require('asn1js');
const forge       = require('node-forge');
const asn1        = forge.asn1;
const pki         = forge.pki;
const out         = require('../utils/reloadTraces.js');
const fs          = require('fs');
const os          = require('os');
const argv        = require('minimist')(process.argv.slice(2));

//Creates a Certificate object which contains all the root-cert information
exports.loadCertificate = function(str) {
  return pki.certificateFromPem(str);
}

exports.generateSelfSignedCertificate = function(digest, subjectName, nodeIDLength) {
  out.info("Generating the user self-signed certificate...");
  out.warning("Only the SHA1 digest is currently supported by this implementation");
  var clientConfig = JSON.parse(fs.readFileSync("./utils/clientConfig.json", "utf8"));

  //First generate a csr object with custom attributes
  var keys = forge.pki.rsa.generateKeyPair(2048);
  //NODE-ID generation with the SHA1 of the given public key
  //Multiple Node-IDs (RFC6940 11.3.1.)
  var nodeID = "";
  var nodeIDTab = [];
  var md = forge.md.sha1.create();
  if(!argv['id'] && clientConfig["selfSignedCertificate"]["multipleNodeID"] && clientConfig["selfSignedCertificate"]["multipleNodeID"] > 1) {
    for(var i = 0; i < clientConfig["selfSignedCertificate"]["multipleNodeID"]; i++)
    {
      var prefix = ''+i;
      var p = prefix.toString().padEnd(4, '0');
      md.update(p+asn1.toDer(pki.publicKeyToAsn1(keys.publicKey)).data);
      var id = md.digest().toHex().substring(0,nodeIDLength);
      nodeID += String(id);
      nodeIDTab.push(new NodeID(id));
      out.info("Calculated NODE-ID ("+i+") : " + id);
    }
  }
  else
  {
    md.update(pki.publicKeyToPem(keys.publicKey));
    var id = '';
    if(!argv['id'])
    {
      id = md.digest().toHex().substring(0,nodeIDLength);
      nodeID += id;
    } else {
      id = argv['id'];
      nodeID += id;
    }
    nodeIDTab.push(new NodeID(id));
    out.info("Calculated NODE-ID : " + id);
  }
    console.log(nodeIDTab);
  // create a certification request (CSR)
  var csr = forge.pki.createCertificationRequest();
  csr.publicKey = keys.publicKey;
  csr.setSubject([{
    name: 'commonName',
    value: clientConfig["selfSignedCertificate"]["CN"]
  }, {
    name: 'countryName',
    value: clientConfig["selfSignedCertificate"]["CNa"]
  }, {
    shortName: 'ST',
    value: clientConfig["selfSignedCertificate"]["ST"]
  }, {
    name: 'localityName',
    value: clientConfig["selfSignedCertificate"]["LN"]
  }, {
    name: 'organizationName',
    value: clientConfig["selfSignedCertificate"]["ON"]
  }, {
    shortName: 'OU',
    value: clientConfig["selfSignedCertificate"]["OU"]
  }]);
  // set (optional) attributes
  csr.setAttributes([{
    name: 'unstructuredName',
    value: nodeID.substring(0,nodeIDLength)
  }]);

  // sign certification request
  var cert = pki.createCertificate();
  cert.publicKey = csr.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(csr.subject.attributes);
  var extensions = csr.attributes;
  cert.setExtensions(extensions);
  cert.sign(keys.privateKey);

  var selfSignedCertificate = pki.certificateToPem(cert);
  out.debug("Certificate : \n" + selfSignedCertificate);
  out.info("Certificate sucessfully created.");

  return {
    certificate: selfSignedCertificate,
    nodeIDs: nodeIDTab,
    keys: {
      private: forge.pki.privateKeyToPem(keys.privateKey),
      public: forge.pki.publicKeyToPem(keys.publicKey)
    }
  };
}

exports.getNodeIdFromCertificate = function(cert) {
  return pki.certificateFromPem(cert).extensions[0].value;
}

exports.generateNodeIds = function() {

}

exports.getNamesFromCN = function(x509cert) {

}

exports.getKeyBasedNodeId = function() {

}

exports.signSecurityBlock = function() {

}
