'use strict';
/**
 * Class used to detect if a Reload Message have to be routed to another node
 */
const out = require('../../utils/reloadTraces.js');
const OpaqueID = require('../messages/header/OpaqueID.js');

module.exports.ForwardingHandler = class ForwardingHandler {
  constructor() {
    /*
    router
    plugin
    connMgr
    conf
    compressor (pathcompressor TODO)
    */
  }
  handleForwarding(msg) {
    var destList = msg.header.destination_list.list;
    var localID = global.nodeID[0];
    try {
      this.processDestination(destList, localID);
    } catch (err) {
      out.warning(err);
    }
    if (!this.isValidDestination(destList, localID)) {
			out.debug('Invalid message ' + msg.header.transaction + ' destination dropped...');
			return 1;
		}
    var nextHop = destList[0];
    if(this.isLocalPeerResponsible(nextHop) && destList.length == 1 || msg.header.ttl == 1) {
		  out.debug('Passing message ' + msg.header.transaction + ' for local peer to upper layer...');
			return 0;
		} else {
      var ttl = msg.header.ttl;
      if (ttl == 0 || ttl > global.conf['initial-ttl']) {
        if (ttl == 0) {
					out.warning("Expired message TTL");
				} else if (ttl > global.conf['initial-ttl']) {
					global.topology.messageRouter.sendError(message.getHeader(), 0xA, "Message TTL greater than initial overlay TTL");
				}
				out.debug('Expired message ' + msg.header.transaction + ' not forwarded');
				return 1;
      }
    }
    out.debug('Forwarding message ' + msg.header.transaction + ' to neighbor...');
    global.topology.messageRouter.forwardMessage(msg);
    return 1;
  }
  processDestination(destList, localID) {
    var nextHop = destList[0];
    switch (nextHop.getType()) {
      case 1: //NodeID
        if (nextHop.id == localID.id && destList.length > 1) {
          destList.splice(0, 1);
          return this.processDestination(destList, localID);
        }
        if (destList.length == 1)
          return destList;
        break;
      case 2: //ResourceID
        return destList;
        break;
      case 3: //OpaqueID
        destList = this.decompressDestinationList(destList);
				this.processDestination(destList, localId);
        return;
        break;
    }
  }
  isValidDestination(destList, localID) {
    var nextHop = destList[0];
    switch(nextHop.getType())
    {
      case 1: //NodeID
        if(nextHop.id == localID.id || nextHop.id == 0)
          return true;
        return global.connectionManager.isNeighbor(nextHop);
        break;
      case 2:
        return destList.length == 1;
        break;
      case 3: //OpaqueID
        return true;
        break;
    }
    throw('Bad destination.');
  }
  decompressDestinationList(destList) {
    var computedDestList = destList[0];
    computedDestList = OpaqueID.decompress(computedDestList);
		//destList.addAll(0, original); TODO (optional)
    return computedDestList;
  }
  isLocalPeerResponsible(dest) {
    //If wildcard
    if(dest == 0)
      return true;
    //If local nodeID
    if(dest.id == global.nodeID[0].id)
      return true;

    //Handle cases where nodeID is unknown
    return global.topology.isLocalPeerResponsible(dest);
  }
}
