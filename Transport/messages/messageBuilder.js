'use strict';
/**
  * RELOAD Message builder class
  */
const Message         = require('./message.js').Message;
const HeaderBuilder   = require('./header.js').HeaderBuilder;
const HashAlgorithm   = require('./secBlock/HashAlgorithm.js').HashAlgorithm;
const NodeID          = require('./header/NodeID.js');
const DestinationList = require('./header/DestinationList.js').DestinationList;

module.exports = class MessageBuilder {
  constructor(instance, localNodeId) {
    this.instance = instance;
    this.localNodeId = localNodeId;
  }
  /**
    * Build a new message objet with the given content and destination
    */
  newMessage(content, destList) {
    if(!content || !destList) throw ('New message must have a valid content and destination list');
    if(destList.length == 0) throw ('Destination list must have at least one entry.');
    var builder = new HeaderBuilder();
    builder.create(this.instance);
    builder.setDestinationList(destList);
    builder.setTtl(this.instance.config["initial-ttl"]);
    builder.setMaxResponseLength(this.instance.config["max-message-size"]);
    builder.setVersion(0x1);
    var header = builder.build();
    return this.finishMessage(header, content);
  }

  finishMessage(header, content) {
    //Just add the local node id in the via list of the header
    header.addToViaList(global.nodeID[0].id);
    return new Message(header, content, null);
  }

  /*
   * Returns a byte array of the node ID
   */
  getWildcard() {
    var data = [];
    for(var i = 0; i<this.localNodeId.length; i++)
    {
      data.push(this.localNodeId.charCodeAt(i));
    }
    return data;
  }
  addLocalToHeader(header, content) {
    header.getViaList().add(sender);
    return new Message(header, content, null);
  }
  newResponseMessage(requestHeader, responseContent)
  {
    var viaList = requestHeader.via_list;
    var destList = requestHeader.destination_list;
    //Destination list is the reverse of via list
    requestHeader.destination_list.list = viaList.list.reverse();
    requestHeader.via_list = new DestinationList();
    requestHeader.via_list.list.push(new NodeID(global.nodeID[0].id));
    //Reset TTL
    requestHeader.ttl = global.conf['initial-ttl'];
    var msg = new Message(requestHeader,responseContent, null);
    return msg;
  }
}
