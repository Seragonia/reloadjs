"use strict";

const Message        = require('../Transport/messages/message.js').Message;
const MessageHandler = require('./MessageHandler.js').MessageHandler;


module.exports = class MessageHandlerBootstrap extends MessageHandler {
  constructor() {
    super();
  }
  static onReceive(socket, buffer) {


    //get the nodeid+1 and find in the topology plugin the closest node

    //Else, compute the message
    // first check if it is a response of a known request
    // or a request
    // or a message to route

  }
}
