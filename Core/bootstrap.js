'use strict';
const fs                      = require('fs');
const out                     = require('../utils/reloadTraces.js');
const forge                   = require('node-forge');
const BigInt                  = require('big-integer');
const Message                 = require('../Transport/messages/message.js');
const addNodeID               = require('../utils/utils.js').addNodeID;
const HashAlgorithm           = require('../Transport/messages/secBlock/HashAlgorithm.js').HashAlgorithm;
const MessageBuilder          = require('../Transport/messages/messageBuilder.js');
const TopologyPlugin          = require('../Topology/TopologyPlugin.js');
const ConnectionManager       = require('../Core/ConnectionManager.js').ConnectionManager;
const SignatureAlgorithm      = require('../Transport/messages/secBlock/SignatureAlgorithm.js').SignatureAlgorithm;
const AttachMessageBuilder    = require('../Transport/messages/content/AttachMessage.js').AttachMessageBuilder;

const NodeID = require('../Transport/messages/header/NodeID.js');
const ResourceID = require('../Transport/messages/header/ResourceID.js');

//Bootstraps the current RELOADjs instance to the given overlay
module.exports = class Bootstrap {
  constructor(instance) {
    this.HashAlgorithm      = HashAlgorithm['SHA1'];
    this.SignatureAlgorithm = SignatureAlgorithm['RSA'];
    this.instance           = instance;
    this.localAddress       = null;
    this.isOverlayInitiator = false;
    this.isClientMode       = false;
    this.nodeID             = "";
    this.certificate        = null;
    this.localKey           = null;
    this.bootstrapPeerList  = [];
    this.port               = 6084; // default
    this.addr               = "";
  }

  getConfiguration() {
    return this.instance.config;
  }
  getJoinData() {
    return new Buffer.alloc(0);
  }
  setLocalCert(cert)
  {
    this.certificate = cert;
  }
  getLocalCert(cert)
  {
    return this.certificate;
  }
  setLocalKey(key) {
    this.localKey = key;
  }
  getLocalKey(key) {
    return this.localKey;
  }
  getHashAlgorithm() {
    return this.HashAlgorithm;
  }
  getSignatureAlgocallbackrithm() {
    return this.SignatureAlgorithm;
  }
  /**
  * Setting the address where the server will be listening to
  */
  setLocalAddress(addr) {
    this.localAddress = addr;
  }
  /**
  * Setter if peer is the first one to join the overlay
  * so he doesn't have to join but needs to set up a
  * bootstrapping server
  */
  setInitiator(isInitiator) {
    this.isOverlayInitiator = isInitiator;
    global.isOverlayInitiator = isInitiator;
    //if bootstrap, then the machine is publically accessible
    //and it can host a TURN server
    if(isInitiator) global.listener.setUpTURN();
  }
  isPeerInitiator() {
    return this.isOverlayInitiator;
  }
  /**
  * Setter if peer must behave as a client. In this case, he will
  * not have to collaborate to the overlay storage and message routing
  * functionalities. A client is not directly reachable by its node id
  * and must be contacted through his connected neighbor.
  */
  setClientMode(isClientMode){
    this.isClientMode = isClientMode;
  }
  isClientMode() {
    return this.isClientMode;
  }
  /**
  * Setter for the current peer node-id. If not is specified,
  * it will be the first id found in the peer certificate
  */
  setLocalNodeId(id) {
    this.nodeID = id;
  }
  getLocalNodeId() {
    return this.nodeID;
  }
  setBootstrapPeerList(list) {
    this.bootstrapPeerList = list;
  }
  setListenerPort(port) {
    this.port = port;
  }
  setListenerAddress(addr) {
    this.addr = addr;
  }
  /**
  * Connects to the overlay
  * Returns the list of successfully connected nodes
  * if the connexion succeed, and throws an error if it failed
  */
  connect(instance) {
    //First start all services : overlay, topology agent...
    var list = this.bootstrapPeerList;
    var sockets = [];
    var client = new Array(list.length);
    var options = {
      rejectUnauthorized: false //TODO
    }
    var isConnected = false;
    for(var i = 0 ; i<list.length; i++)
    {
      if(!list[i].name) continue;
      const port = list[i].name.port;
      const addr = list[i].name.address;
      if(isConnected) break;
      let t = this;
      let socket = global.connectionManager.connectTo(port, addr, options, function(connection) {
        if(isConnected)
        {
          socket.write('close', '');
        }
        else
        {
          out.info('Connected to the bootstrap peer ('+addr+':'+port+')');
          if(addr != global.addr)
          {
            out.debug('Adding the bootstrap peer as a TURN server');
            global.turns.push(addr);
          }
          out.info('Sending attach request with the local node id.');
          //Attach request to the bootstrap peer
          global.topology.AttachService.attachTo(connection.socket, [connection.stack.nodeID, new ResourceID(addNodeID(t.nodeID.id))], true);
        }
        isConnected = true;
      });
      client[i] = socket;
    }
  }
}
