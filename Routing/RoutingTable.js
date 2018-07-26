'use strict';
const out = require('../utils/reloadTraces.js');

/*
 * Abstract class with methods to route messages. It should be possible
 * for the API's user to implement his own RoutingTable class.
 */

module.exports.RoutingTable = class RoutingTable {
  constructor() {
  }
  /*
   * Returns the next hops node-ids
   * @return: Set(NodeID)
   */
  getNextHops(destination) {}//typeof destination = RoutableID

  getNeighbors() {}
}
