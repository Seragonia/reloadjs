'use strict';
/*
 * Class used to respond to a received request.
 */
const tls = require('tls');
const pki = require('node-forge').pki;
const out = require('../utils/reloadTraces.js');
const NodeID = require('../Transport/messages/header/NodeID.js');
const ReloadStack = require('../Transport/stack/ReloadStack.js').ReloadStack;
const ReloadCertificate = require('../Crypto/ReloadCertificate.js').ReloadCertificate;
const JoinRequest = require('../Transport/messages/content/JoinRequest.js');
const MessageBuilder = require('../Transport/messages/messageBuilder.js');
const Header            = require('../Transport/messages/header.js').Header;
const Content           = require('../Transport/messages/content/Content.js');
const Message           = require('../Transport/messages/message.js').Message;
const UpdateAnswer      = require('../Transport/messages/content/UpdateAnswer.js');
const UpdateRequest     = require('../Transport/messages/content/UpdateRequest.js');
const LeaveRequest      = require('../Transport/messages/content/LeaveRequest.js');
const PingRequest       = require('../Transport/messages/content/PingRequest.js');

module.exports.ConnectionManager = class ConnectionManager {
  constructor() {
    //Connections will store a tuple: nodeID + socket
    //And will be used to send messages automatically
    this.connections = [];
  }
  sendMessage(socket, msg) {
    try {
      socket.write(msg.serialize().toBuffer());
      return 1;
    } catch(err) {
      global.connectionManager.removeConnection(socket);
      socket.destroy();
      return 0;
    }
  }
  getConnection(nodeID) {
    for(var k in this.connections)
    {
      if(this.connections[k].stack.nodeID.id == nodeID.id)
      {
        return this.connections[k].socket;
      }
    }
    return null;
  }
  isNeighbor(nodeID) {
    var c = this.getConnection(nodeID);
    return c ? c : false;
  }
  connectTo(port, addr, options, callback) {
    let s = tls.connect(port, addr, options, function() {
      //Get certificate and add the connexion to the list of known peers
      var cert = '-----BEGIN CERTIFICATE-----\r\n' + s.getPeerCertificate(true).raw.toString('base64') + '\r\n-----END CERTIFICATE-----\r\n';
      callback(global.connectionManager.addConnection(new NodeID(pki.certificateFromPem(cert).extensions[0].value), s, cert));
    });
    s.on('data', (data) =>  {
      if(data.toString() == "close")
      {
        global.connectionManager.removeConnection(s);
        s.destroy();
      } else {
        global.topology.messageHandlers.handleMessage(s, data);
      }
    });
    s.on('end', () => {
      out.debug('Ended');
    });
    s.on('error', (err) => {
      out.warning('Failed to connect the bootstrapnode '+addr+':'+port+"\n => " + err);
    });
    return s;
  }
  addConnection(nodeID, socket, cert, isICE = 0) {
    for(var k in this.connections)
    {
      if(this.connections[k].stack.nodeID.id == nodeID.id)
      {
        //Connection already exists
        if(isICE) {
          return null;
        }
        return this.connections[k];
      }
    }
    let conn = {stack: new ReloadStack(nodeID), socket: socket};
    this.connections.push(conn);
    let timePing =  global.instance.config["chord-ping-interval"]*1000;
    for(var entry of global.topology.pendingPing)
      if(entry.id == nodeID.id)
        entry.cpt = 0;
    global.topology.pendingPing.add({id: nodeID.id, cpt: 0});
    //We need to periodically send ping so we can detect connection loss
    let pingInterval = setInterval(function(){
      out.debug('Send periodic ping to ' + nodeID.id);
      var ping = new PingRequest();
      var req = global.topology.messageBuilder.newMessage(ping, [new NodeID(nodeID.id)]);
      if(!global.connectionManager.sendMessage(conn.socket, req))
      {
        out.debug('Connection no longer valid! Removing entry...');
        clearInterval(pingInterval);
        for(var entry of global.topology.pendingPing)
          if(entry.id == nodeID.id)
            global.topology.pendingPing.delete(entry);
      }

      setTimeout(function(){
        for(var entry of global.topology.pendingPing)
        {
          if(entry.id == nodeID.id)
          {
            entry.cpt += 1;
            if(entry.cpt == 5)
            {
              out.debug('Ping Timeout! Removing entry...');
              global.connectionManager.removeConnection(conn.socket);
              conn.socket.destroy ? conn.socket.destroy() : conn.socket.close();
              clearInterval(pingInterval);
              for(var entry of global.topology.pendingPing)
                if(entry.id == nodeID.id)
                  global.topology.pendingPing.delete(entry);
            }
          }
        }
      }, 4000);
    }, timePing);
    //We need to periodically send UpdateReq so we can handle topology changes
    let updateInterval = setInterval(function(){
      out.debug('Send periodic Update to ' + nodeID.id);
      var update = new UpdateRequest();
      var req = global.topology.messageBuilder.newMessage(update, [new NodeID(nodeID.id)]);
      if(!global.connectionManager.sendMessage(conn.socket, req))
      {
        out.debug('Connection no longer valid! Removing entry...');
        clearInterval(updateInterval);
      }
    }, global.instance.config["chord-update-interval"]*1000);
    //Also add the certificate to the keystore
    global.keyStore.addCertificate(new ReloadCertificate(cert, nodeID));
    return this.connections[this.connections.length-1];
  }
  removeConnection(socket) {
    if(socket == null) return;
    for(var k in this.connections)
    {
      if(this.connections[k].socket == socket)
      {
        let id = this.connections[k].stack.nodeID.id;
        //TODO adapt with chord
        global.topology.routing.getNeighbors().forEach(function(v) {
          if(id == v.id) //typeof RoutingTable
            global.topology.routing.getNeighbors().delete(v);
        });
        global.topology.routing.successors.delete(id);
        global.topology.routing.predecessors.delete(id);
        //Connection already exists
        this.connections.splice(k,1);
        out.debug('Connection removed.');
        return id;
      }
    }
  }
  removeAll() {
    var req = null;
    var leave = null;
    for(var conn of global.connectionManager.connections)
    {
      out.debug('Closing connection to '+conn.stack.nodeID.id);
      if(global.topology.routing.successors.has(conn.stack.nodeID.id))
      {
        leave = new LeaveRequest(1);
      } else if(global.topology.routing.predecessors.has(conn.stack.nodeID.id))
      {
        leave = new LeaveRequest(2);
      } else {
        leave = new LeaveRequest(1);
      }
      req = global.topology.messageBuilder.newMessage(leave, [new NodeID(conn.stack.nodeID.id)]);
      global.connectionManager.sendMessage(conn.socket, req);
      conn.socket.destroy ? conn.socket.destroy() : conn.socket.close();
    }
  }
  ICEonConnect(channel) {
    //connected, send local information
    var msg = {
      id: global.nodeID[0].id,
      cert: global.localCertificate.cert
    };
    channel.send(JSON.stringify(msg));
    channel.write = channel.send;
  }
  ICEonMessage(channel, msg, rtc) {
    channel.write = channel.send;
    try {
      var m = JSON.parse(msg);
      //test if it is the first message
      if(m["id"])
      {
        //add entry in the routing table
        global.topology.routing.addNeighbor(new NodeID(m["id"]), rtc.localDescription.sdp);
        out.info("ICE: Add new connection ("+m["id"]+")");
        if(!global.connectionManager.addConnection(new NodeID(m.id), channel, m.cert, 1)) {
          channel.send(JSON.stringify({close: 1}));
          //Here, use the socket to join
          if(!global.joined && !global.topology.isOverlayInitiator) {
            out.info('Sending JoinRequest');
            //join here the overlay
            var join = new JoinRequest(global.nodeID[0]);
            let req = global.topology.messageBuilder.newMessage(join, [new NodeID(m.id)]);
            global.connectionManager.sendMessage(global.connectionManager.getConnection(new NodeID(m.id)), req);
          }
        } else {
          //Here, use the datachannel to join
          if(!global.joined && !global.topology.isOverlayInitiator) {
            //join here the overlay
            var join = new JoinRequest(global.nodeID[0]);
            var builder = new MessageBuilder(global.topology.instance, global.nodeID);
            let req = builder.newMessage(join, [new NodeID(m.id)]);
            global.connectionManager.sendMessage(channel, req);
          }
        }
        //Add Admitting peer in global space so we can remember it if
        //reload is started in client mode
        if(!global.isOverlayInitiator)
          global.AP = m.id;
        return;
      }
      //test if it is the close message
      if(m["close"]) {
        channel.close();
        return;
      }
    } catch(err) {
      //Else, parse the reload message
      if(msg == 'close') {
        channel.close();
        return;
      }
      global.topology.messageHandlers.handleMessage(channel, this.toBuffer(msg));
    }
  }
  toBuffer(ab) {
    var buf = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
  }
  ICEonClose(channel) {
    channel.write = channel.send;
    //remove dist nodeID to list of socket
    global.connectionManager.removeConnection(channel);
  }
  forward(socket, msg) {
    out.debug('Forwarding a message to a known neighbor ('+msg.header.getNextHop().id+')');
    this.sendMessage(socket, msg);
  }
}
