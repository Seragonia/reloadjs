'use strict';

/**
  * The default TopologyPlugin
  */
const TopologyPlugin  = require('./TopologyPlugin.js');
const AttachService   = require('../Services/AttachService.js').AttachService;
const DestinationList = require('../Transport/messages/header/DestinationList.js').DestinationList;
const getDistance     = require('../utils/utils.js').getDistance;
const addNodeID       = require('../utils/utils.js').addNodeID;

module.exports.DefaultTopologyPlugin = class DefaultTopologyPlugin extends TopologyPlugin {
  constructor(routing) {
    super(routing);
    this.RESID_LENGTH = 16;
  }
  init(instance, connectionManager, messageRouter, messageBuilder, messageHandlers, bootstrap) {
    global.topology          = this;
    this.instance            = instance;
    global.connectionManager = connectionManager;
    this.messageRouter       = messageRouter;
    this.messageBuilder      = messageBuilder;
    this.messageHandlers     = messageHandlers;
    this.AttachService       = new AttachService();
    this.joined              = false;
    this.pendingPing         = new Set();
  }

  start(bootstrap) {
    //Start the node listener
    global.listener.init(global.privateKey, global.localCertificate, bootstrap.port);
    global.connections = global.listener.connections;
    //Connect to the bootstrap peer (or set up the listening server if initiator)
    //Start the node listener service
    this.isOverlayInitiator = bootstrap.isOverlayInitiator;
    if(!bootstrap.isOverlayInitiator)
      bootstrap.connect(this.instance.savedInstance);
  }
  requestJoin() {
    //TODO
    var destList = new DestinationList();
    destList.
    this.AttachService.attachTo(destList, true);
  }
  requestUpdate() {

  }
  getRoutingTable() {
    return this.routing;
  }
  isLocalPeerResponsible(dest) {
    let distanceLoc = 9007199254740991;
    if(this.joined || this.isOverlayInitiator)
      distanceLoc = getDistance(dest, global.nodeID[0]);
    try {
      global.topology.routing.getNeighbors().forEach(function(route) {
        var distTemp = getDistance(route, dest);
        if(distTemp < distanceLoc && global.connectionManager.getConnection(route)) {
          throw {};
        }
      });
    } catch(e) {
      return false;
    }
    return true;
  }
}
