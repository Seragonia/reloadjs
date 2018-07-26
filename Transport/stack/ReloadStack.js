'use strict';
/*
 * Class associated to a socket:
 * FrameMessageHandler
 * MessageHeaderDecode
 * ForwardingHandler
 * MessageContentDecode
 * SecBlockCheck
 * MessageDispatcher
 */
const ForwardingHandler = require('./ForwardingHandler.js').ForwardingHandler;
const out = require('../../utils/reloadTraces.js');
const NodeID = require('../messages/header/NodeID.js');

 module.exports.ReloadStack = class ReloadStack {
   constructor(nodeID)
   {
     this.nodeID = nodeID;
     this.forwarding = new ForwardingHandler();
   }
   handleMessage(message) {
     //Frame message
     //TODO
     out.debug('Handling message...');
     if(this.forwarding.handleForwarding(message))
       return; //Message forwarded, no more action needed
     else {
       //Destination is the local peer, so handle the MessageType
       //try {
         global.listener.MessageDispatcher.handleMessageType(message.content.message_code, message);
      /* } catch (err) {
         out.warning("Error : " + err);
       }*/
     }
   }
 }
