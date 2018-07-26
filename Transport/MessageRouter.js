'use strict';
/**
  * RELOAD Message builder class
  */
const MessageBuilder           = require('./messages/messageBuilder.js');
const RoutableID               = require('./messages/header/RoutableID.js');
const Header                   = require('./messages/header.js').Header;
const NodeID                   = require('./messages/header/NodeID.js');

var RoutageStatus = Object.freeze({
  NOTHING: -1,
  CREATED:  0,
  SENDING:  1,
  SENT:     2,
  ERROR:    3
});

module.exports.MessageRouter = class MessageRouter {
  constructor(conf, localNodeId) {
    this.messageBuilder = new MessageBuilder(conf, localNodeId);
  }
  sendRequest(msg) {
    this.sendMessage(msg);
  }
  sendAnswer(header, content) {
    return this.sendMessage(this.messageBuilder.newResponseMessage(header, content));
  }
  sendError(header, errorType, info) {
    //TODO : handle error types
    this.sendAnswer(header, new Error(errorType, info));
  }
  /*
   * Sends a message to the destination node in the overlay.
   * This method is asynchronous and there is no need to wait for the return
   * value synchronously.
   * @param msg : Message type
   */
  sendMessage(msg) {

    if(!msg) throw('Null message.');
    let next = msg.header.destination_list.list[0];
    let hops = this.getNextHops(next);
    if(next.length == 0)
    {
      throw('No route to '+next+' for message '+msg.getTransactionId);
    }
    //Transmit the message to all the hops
    for(next in hops) {
      this.transmit(msg, hops[next]);
    }
    return;
  }
  getNextHops(dest) {
    if(dest && this.isDirectlyConnected(dest)) {
      return [dest];
    } else {
      return global.topology.getRoutingTable().getNextHops(dest);
    }
  }
  isDirectlyConnected(next) {
    return global.connectionManager.isNeighbor(next);
  }
  transmit(msg, neighbor) {
    //conn is the socket associated to the given nodeID
    try {
      var conn = null;
      if(neighbor.id)
        conn = global.connectionManager.getConnection(neighbor);
      else
        conn = global.connectionManager.getConnection(new NodeID(neighbor));

      if(!conn)
      {
        throw('Connection to neighbor node '+neighbor+' is invalid!');
      }
      global.connectionManager.sendMessage(conn, msg);
    } catch(err)
    {
      console.log(err);
    }
  }
  forwardMessage(msg) {
    var header = msg.header;
    header.toForward(msg.header.via_list.list[msg.header.via_list.list.length-1]);
    //If destination is directly connected, forward message to it
    var conn = global.connectionManager.getConnection(header.getNextHop());
    if(conn) {
      global.connectionManager.forward(conn, msg);
    }
    //If not directly connected, forward to the nearest known node
    else {
      for(var nextHop of this.getNextHops(header.getNextHop()))
      {
        global.connectionManager.forward(global.connectionManager.getConnection(nextHop), msg);
      }
    }
  }
}
