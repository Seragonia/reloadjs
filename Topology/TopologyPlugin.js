'use strict';

/**
  * The algorithm that performs the resource based routing and
  * controls the overlay. Each instance of this class is responsible
  * for a single nodeid of the local peer.
  */

const DefaultRoutingTable = require('../Routing/DefaultRoutingTable.js').DefaultRoutingTable;

module.exports = class TopologyPlugin {
  constructor(r) {
    this.routing = (r) ? r : new DefaultRoutingTable(); //default
  }
  start() {}
  /**
   * Join the overlay through the given admitting peer
   * @return the node id of the peer which answered the join
   */
  requestJoin() {}
  /**
   * Request to send an update message to the given neighbor
   * @param neighbor: NodeID of the given neighbor
   */
  requestUpdate(neighbor) {}
  /**
   * Requests to leave message to the given neighbor
   */
  requestLeave() {}
  /**
   * The length of the resourceID used by the instance of TopologyPlugin
   */
  get resourceIdLength() {}
  /**
   * Compute the ResourceID according to the length for the given byte array
   * of the resource identifier
   * @param resourceIdentifier
   */
  get resourceID() {}
  /**
   * Returns the closest id from the list to the given destination
   * @param destination
   * @param ids
   * @return The id in the list that is the closest to the given destination
   */
  getCloserId() {}

  //Utils methods
  /**
   * @param RoutableID source
   * @param RoutableID destination
   * @return {int}, the distance between the two peers
   *  according to the TopologyPlugin
   */
  getDistance(src, dest) {}
  /**
   * @param RoutableID
   * @return {bool} True if the local peer is responsible for the destination ID
   */
  isLocalPeerResponsible(dest) {}
  /**
   * @param ResourceId
   * @param bool
   * @return {bool} true if the local peer should store this ResourceID
   */
  isLocalPeerValidStorage(resourceId, isReplica) {}
  /**
   * @param ResouceID
   * @return {Array<NodeID>} List of NodeID that are replicaNode
   *  for the given resourceID
   */
  getReplicaNodes(resourceId) {}
  /**
   * @return RoutingTable
   */
  getRoutingTable() {
    return this.routingTable;
  }
}
