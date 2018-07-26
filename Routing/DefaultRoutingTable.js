'use strict';
const out = require('../utils/reloadTraces.js');
const RoutingTable = require('./RoutingTable.js').RoutingTable;
const convertNodeID = require('../utils/utils.js').convertNodeID;
const getDistance = require('../utils/utils.js').getDistance;

//const chord = require('./CHORDRoutingTable.js').CHORDRoutingTable;
/*
 * Default routing class.
 */
module.exports.DefaultRoutingTable = class DefaultRoutingTable extends RoutingTable {
  constructor() {
    super();
    this.neighbors = new Set();
  }
  addNeighbor(id)
  {
    let i = id;
    try {
      this.neighbors.forEach(function(value) {
        if(i.id == value.id) {
          out.debug('Neighbor already known!');
          throw {};
        }
      });
    } catch(e) {
      return;
    }
    this.neighbors.add(id);
  }
  /*
   * Returns the next hops node-ids
   * @return: Set(NodeID)
   */
  getNextHops(destination) {
    var candidates = new Set(this.neighbors);
    if(this.neighbors.length === 0) {
      return [];
    }
    if(!destination.id == global.nodeID[0].id && candidates.length > 1) {
      candidates.delete(global.nodeID[0]);
    }
    var singleNextHop = module.exports.getCloserId(destination);
    return [singleNextHop];
  }

  getNeighbors() {
    return this.neighbors;
  }
}

module.exports.getCloserId = function(nodeID) {
  let distanceLoc = Number.MAX_SAFE_INTEGER;
  let retNodeID = null;
  global.topology.routing.neighbors.forEach(function(value) {
    var distTemp = getDistance(value, nodeID);
    if(distTemp < distanceLoc && value.id != nodeID.id) {
      distanceLoc = distTemp;
      retNodeID = value;
    }
  });
  return retNodeID;
}
