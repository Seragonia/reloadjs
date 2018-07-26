'use strict';
/**
 * A ReloadCertificate is a x509 certificate with a nodeID
 */

 module.exports.ReloadCertificate = class ReloadCertificate {
   constructor(cert, nodeid)
   {
     this.cert = cert;
     this.nodeid = nodeid;
   }
   getNodeId() {
     return this.nodeid;
   }
 }
