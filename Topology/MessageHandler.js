"use strict";

const pki               = require('node-forge').pki;
const out               = require('../utils/reloadTraces.js');
const Header            = require('../Transport/messages/header.js').Header;
const NodeID            = require('../Transport/messages/header/NodeID.js');
const Message           = require('../Transport/messages/message.js').Message;
const Content           = require('../Transport/messages/content/Content.js');
const SecBlock          = require('../Transport/messages/secBlock/SecurityBlock.js').SecurityBlock;
const SmartBuffer       = require('smart-buffer').SmartBuffer;
const AttachMessage     = require('../Transport/messages/content/AttachMessage.js').AttachMessage;
const ReloadCertificate = require('../Crypto/ReloadCertificate.js').ReloadCertificate;
const getNodeIdFromCertificate = require('../Crypto/X509Utils.js').getNodeIdFromCertificate;
module.exports.MessageHandler = class MessageHandler {
  constructor() {
  }
  /**
   * Function that decodes the buffer, checks the mesage validity
   * (signature etc) and returns the Message object with the messageType
   */
  handleMessage(socket, buffer) {
    out.debug('Received '+buffer.length+' bytes.');
    //Decode message Header
    var headerDecoded, contentDecoded, contentSize;
    headerDecoded = Header.deSerialize(buffer);
    var contentStart = headerDecoded.buffer.readOffset;
    //Verify message + security block
    contentDecoded = Content.deSerialize(headerDecoded.buffer);
    contentSize = contentDecoded.buffer.readOffset - contentStart;
    var message = new Message(headerDecoded.data, contentDecoded.data, null);
    //Decode message Content
    var secBlockDecoded = SecBlock.deSerialize(contentDecoded.buffer);
    message.secBlock = secBlockDecoded.data;
    headerDecoded.buffer.readOffset = contentStart;
    if(!MessageHandler.verify(headerDecoded.data, headerDecoded.buffer.readBuffer(contentSize), secBlockDecoded.data, secBlockDecoded.data.signature.digest)) {
      out.debug('Bad signature received.');
      return;
    } else {
      out.debug('Message received: signature OK.');
    }
    //Addconnection
    var connStack = global.connectionManager.addConnection(new NodeID(getNodeIdFromCertificate(message.secBlock.certificates[0])), socket, message.secBlock.certificates[0]);
    //ReloadStack to handle what to do with this message
    connStack.stack.handleMessage(message);
  }
  /**
   * This function verifies that the given signature matches the message signature
   * (using the certificate given in the SecurityBlock part of the RELOAD message)
   */
  static verify(header, contentBuffer, secBlock, signature) {
    //Checking the sequence number
    if(header.configuration_sequence < global.configuration_sequence) {
      out.error('Error_config_Too_Old');
      return false;
    }
    if(header.configuration_sequence > global.configuration_sequence) {
      out.error('Error_config_Too_New');
      return false;
    }
    var buffer = new SmartBuffer();
    var cert = new ReloadCertificate(secBlock.certificates[0], pki.certificateFromPem(secBlock.certificates[0]).extensions[0].value);
    buffer.writeStringNT(header.overlay);
    buffer.writeUInt32BE(header.transaction);
    buffer.writeBufferNT(contentBuffer);
    var buf = buffer.toBuffer();
    var key = pki.publicKeyToPem(pki.certificateFromPem(cert.cert).publicKey);
    var signer = global.cryptoHelper.newSignerVerify(key, cert);
    var result = signer.verify(signature, buf);

    return result;
  }
}
