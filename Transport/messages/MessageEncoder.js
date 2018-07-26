'use strict';
/**
  * Class used for message payload (content + security block)
  */
const crypto = require('crypto');
const SmartBuffer = require('smart-buffer').SmartBuffer;
const SecurityBlock = require('./secBlock/SecurityBlock.js').SecurityBlock;
const Signer = require('../../Crypto/Signer.js').Signer;
const GenericCertificate = require('./secBlock/GenericCertificate.js').GenericCertificate;
//Length of the header from the beginning to the message length field
const HEADER_LENGTH_OFFSET = 16;
const MAX_MESSAGE_SIZE = 5000; //default
module.exports = class MessageEncoder {
  constructor() {

  }
  serialize(msg, buf) {
    var contentBuffer = new SmartBuffer();
    contentBuffer = msg.content.serialize(contentBuffer);
    var secBlock = this.computeSecBlock(msg.header, contentBuffer.toBuffer());
    buf = SecurityBlock.serialize(secBlock, buf);
    return buf;
  }

  setMessageLength(buf) {
    return buf;
  }

  computeSecBlock(header, contentBuffer) {
    var buffer = new SmartBuffer();
    buffer.writeStringNT(header.overlay);
    buffer.writeUInt32BE(header.transaction);
    buffer.writeBufferNT(contentBuffer);
    var buf = buffer.toBuffer();
    var signer = global.cryptoHelper.newSigner();
    signer.update(buf);
    var signature = signer.sign();
    //Check verify
    /*var verify = crypto.createVerify('RSA-SHA1');
    verify.update(buf);
    console.log(verify.verify(global.localPublicKey, signature.digest));*/

    //Add all needed Generic Certificates
    var genCertificates = [];
    var certifs = global.cryptoHelper.getLocalTrustRelationship();
    for (var c in certifs) {
      genCertificates.push(new GenericCertificate(certifs[c]));
    }
    return new SecurityBlock(genCertificates, signature);
  }
}
