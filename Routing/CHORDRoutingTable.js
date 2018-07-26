'use strict';
const out = require('../utils/reloadTraces.js');
const RoutingTable = require('./RoutingTable.js').RoutingTable;
const convertNodeID = require('../utils/utils.js').convertNodeID;
const getDistance = require('../utils/utils.js').getDistance;
const NodeID = require('../Transport/messages/header/NodeID.js');
const ElementOfInterval = require('../utils/utils.js').ElementOfInterval;
const Sort = require('../utils/utils.js').Sort;
const UpdateAnswer = require('../Transport/messages/content/UpdateAnswer.js');
const addNodeID = require('../utils/utils.js').addNodeID;
const ResourceID = require('../Transport/messages/header/ResourceID.js');

const CACHE_SIZE = 3

module.exports.NodeState = Object.freeze({
  unknown: 0,
  attaching: 1,
  attached: 2,
  updates_received: 3
});

/**
  * Routing table Entry object
  */
module.exports.RTableEntry = class RTableEntry {
  constructor(iceCandidates, nodeID) {
    this.iceCandidates = iceCandidates;
    this.lastSuccessfullPing = null;
    this.id = nodeID;
    this.nodeState = 0;
    this.pinging = false;
    this.waitForJoinAnswer = false;
  }
}

/**
  * Finger table Entry object
  */
module.exports.FTableEntry = class FTableEntry {
  constructor(successor, finger) {
    this.id = finger; //(resourceid)
    this.successor = successor;
    this.lastSuccessfullFinger = null;
    this.nodestate = 0;
    this.pinging = false;
    this.valid = false;
  }
}

/*
 * CHORD routing class.
 */
module.exports.CHORDRoutingTable = class CHORDRoutingTable extends RoutingTable {
  constructor() {
    super();
    this.rtable = new Set();
    this.learnedFromTable = new Set();
    this.neighborInfoTable = new Set();
    this.ftable = new Set();
    this.updateReceivedFromUnattachedNode = new Set();
    //List of leaved nodes, so we don't need to learn about them later
    this.leavedNodes = new Set();

    this.predecessors = new Set();
    this.successors = new Set();
    this.fingerSuccessors = new Set();
  }

  addNeighbor(nodeID, sdpAns)
  {
    try {
      var hasNodeID = false;
      for(var item of this.rtable)
      {
        if(item.id == nodeID.id)
          hasNodeID = true;
      }
      if(!hasNodeID && nodeID.id != global.nodeID[0])
      {
        var rEntry = new exports.RTableEntry(sdpAns, nodeID.id);
        rEntry.lastSuccessfullPing = new Date();
        this.rtable.add(rEntry);
        out.debug('(routing) Add node '+nodeID.id);
      }
    } catch(err) {
      out.error('addNeighbor(): '+err);
    }
    if(this.isFinger(nodeID.id)) {
      this.addFinger(nodeID,exports.NodeState.attached);
    }
  }
  setNodeState(nodeID, state) {
    try {
      var rEntry = this.tryGetValue(nodeID);
      if(nodeID && rEntry)
      {
        var oldState = rEntry.nodeState;
        switch(rEntry.nodeState)
        {
          case exports.NodeState.unknown:
            rEntry.nodeState = state;
            break;
          case exports.NodeState.attaching:
            rEntry.nodeState = state;
            break;
          case exports.NodeState.attached:
            if(state == exports.NodeState.attaching)
            {
              //Ignore
            } else {
              if(state == exports.NodeState.attached && this.updateReceivedFromUnattachedNode.has(nodeID.id))
              {
                this.updateReceivedFromUnattachedNode.delete(nodeID.id);
                rEntry.nodeState = exports.NodeState.updates_received;
              } else {
                rEntry.nodeState = state;
              }
            }
            break;
          case exports.NodeState.updates_received:
            if(state != exports.NodeState.attached && state != exports.NodeState.attaching)
            {
              rEntry.nodeState = state;
            }
            break;
        }
        //Send update to all neighbors if necessary
        if(global.joined && (state == exports.NodeState.attached || rEntry.nodeState == exports.NodeState.updates_received)
                         && (oldState == exports.NodeState.attaching || oldState == exports.NodeState.unknown)) {
          if(this.predecessors.has(nodeID.id) || this.successors.has(nodeID.id)) {
            this.sendUpdateToAllNeighbors();
          }
        }
      } else {
        if(state == exports.NodeState.updates_received) {
          this.updateReceivedFromUnattachedNode.add(nodeID.id);
        }
      }
    } catch(err) {
      out.error('setNodeState(): '+err);
    }
  }
  setPinging(nodeID, ping, success) {
    try {
      var rTableEntry = this.tryGetValue(nodeID);
      if(nodeID && rTableEntry) {
        rTableEntry.pinging = ping;
        if(success) {
          rTableEntry.lastSuccessfullPing = out.getTime();
        }
      }
    } catch(err) {
      out.error('setPinging(): '+err);
    }
  }
  setWaitForJoinAnswer(nodeID, bool) {
    try {
      var rTableEntry = this.tryGetValue(nodeID);
      if(nodeID && rTableEntry)
      {
        rTableEntry.waitForJoinAnswer = bool;
      }
    } catch(err) {
      out.error('setWaitForJoinAnswer(): '+err);
    }
  }
  getNodeState(nodeID) {
    var rTableEntry = this.tryGetValue(nodeID);
    if(nodeID && rTableEntry)
    {
      return rTableEntry.nodeState;
    }
    return exports.NodeState.unknown;
  }
  getPing(nodeID) {
    var rTableEntry = this.tryGetValue(nodeID);
    if(nodeID && rTableEntry)
    {
      return rTableEntry.pinging;
    }
    return false;
  }
  isWaitForJoinAns(nodeID) {
    var rTableEntry = this.tryGetValue(nodeID);
    if(nodeID && rTableEntry)
    {
      return rTableEntry.waitForJoinAnswer;
    }
    return false;
  }
  isAttached(nodeID) {
    var nodestate = this.getNodeState(nodeID);
    return nodestate == exports.NodeState.attached || nodestate == exports.NodeState.updates_received;
  }
  gotUpdatesFrom(nodeID) {
    var nodestate = this.getNodeState(nodeID);
    return nodestate >= 2;
  }
  getSuccessorCount(onlyApproved) {
    var iCount = 0;
    for(var i = 0; i<this.successors.size; i++)
    {
      if(this.successors[i] != null)
      {
        if(!onlyApproved || this.isAttached(this.successors[i]))
          ++iCount;
      } else
        break;
    }
    return iCount;
  }
  getPredecessorCount(onlyApproved) {
    var iCount = 0;
    for(var i = 0; i<this.predecessors.size; i++)
    {
      if(this.predecessors[i] != null)
      {
        if(!onlyApproved || this.isAttached(this.predecessors[i]))
          ++iCount;
      } else
        break;
    }
    return iCount;
  }
  getApprovedSuccessor() {
    for(var i = 0; i<this.successors.size; i++) {
      if(this.gotUpdatesFrom(this.successors[i])) {
        return this.successors[i];
      }
      return global.nodeID[0];
    }
  }
  getApprovedPredecessor() {
    for(var i = 0; i<this.predecessors.size; i++) {
      if(this.gotUpdatesFrom(this.predecessors[i])) {
        return this.predecessors[i];
      }
      return global.nodeID[0];
    }
  }
  getSuccessor(i) {
    if(i >= 0 && i < this.successors.size)
      return this.successors[i];
    return null;
  }
  getPredecessor(i) {
    if(i >= 0 && i < this.predecessors.size)
      return Array.from(this.predecessors)[i];
    return null;
  }
  /**
   * JP MUST enter all the peers it has contacted into its
   * routing table.
   */
  connectToRoute() {
    for(var rentry in this.rtable) {
      if(rentry.nodeState == exports.NodeState.attached) {
        rentry.nodeState = exports.NodeState.updates_received;
      }
    }
    for(var fentry in this.ftable) {
      if(fentry.nodeState == exports.NodeState.attached) {
        fentry.nodeState = exports.NodeState.updates_received;
      }
    }
  }
  getNode(nodeID) {
    if(nodeID == null)
      return null;
    var ret = this.tryGetValue(nodeID);
    if(ret != null)
      return ret;
  }
  /*
   * Returns the next hops node-ids
   * @return: Set(NodeID)
   */
  getNextHops(destination) {
    console.log('destination: ', destination);
    for(var node of global.connectionManager.connections)
    {
      if(node.stack.nodeID.id && destination.id == node.stack.nodeID.id) {
        console.log('1');
        return [this.getNode(node.stack.nodeID)];
      }
    }
    if(this.gotUpdatesFrom(destination)) {
      console.log('2');
      return [this.getNode(destination)];

    }
    if(global.modeClient == true) {
      console.log('3');
      return [global.AP];
    }
    if(this.successors.size == 0) {
      console.log('4');
      return [global.nodeID[0]];
    }
    console.log('a');

      // console.log(ElementOfInterval(destination, new NodeID(this.getPredecessor(0)), global.nodeID[0], true));
    /*if(ElementOfInterval(destination, new NodeID(this.getPredecessor(0)), global.nodeID[0], true))
      return [global.nodeID[0]];*/
    for(var succ of this.successors) {
      if(ElementOfInterval(destination, global.nodeID[0], new NodeID(succ))) {
        console.log(this.successors);
        console.log('rtable: ', this.rtable, 'succ: ', succ);
        console.log(this.getNode(new NodeID(succ)));
        return [new NodeID(this.getNode(new NodeID(succ)).id)];
      }
    }
    console.log('b');
    var closest = this.getClosestPrecedingNode(destination);
    console.log('dest:', destination, 'closest:', closest);
    return [new NodeID(closest)];
  }
  tryGetValue(nodeID) {
    for(var item of this.rtable) {
      if(item.id == nodeID.id)
        return item;
    }
    return null;
  }
  getClosestPrecedingNode(nodeID) {
    let id = nodeID;
    let distanceLoc = 9007199254740991;
    var nodeID = global.topology.routing.rtable[0] ? global.topology.routing.rtable[0].id : global.nodeID[0].id;
    global.topology.routing.rtable.forEach(function(rEntry) {
      console.log('1: ', rEntry, '2: ', id);
      var distTemp = getDistance(new NodeID(rEntry.id), new NodeID(id));
      if(distTemp < distanceLoc) {
        id = rEntry.id;
        distanceLoc = distTemp;
      }
    });
    return id;
    /*var next = new Set(this.successors);
    if(this.predecessors.size > 0)
    {
      for(var predecessor of this.predecessors){
        if(ElementOfInterval(nodeID, new NodeID(predecessor), global.nodeID[0]))
          next.add(predecessor);
      }
    }
    var closestPrecedingFinger = this.getClosestPrecedingFinger(nodeID);
    if(closestPrecedingFinger != null)
      next.add(closestPrecedingFinger.id);

    var closestNode = null;
    next.add(nodeID.id);
    if(next.size > 1)
      next = Sort(next);
    var array = Array.from(next);
    var nodeIDIndex = array.indexOf(nodeID.id);
    var index = (next.size + (nodeIDIndex - 1)) % next.size;
    var closestIDNode = array[index];
    console.log('closestIDNode:', closestIDNode);
    closestNode = this.getNode(closestIDNode);
    return closestNode;*/
  }
  getClosestPrecedingFinger(nodeID) {
    var successors = new Set();
    var successorsIds = new Set();
    for(var fEntry of this.ftable)
    {
      if(!successorsIds.has(fEntry.successor)
          && fEntry.nodeState == exports.NodeState.updates_received)
          {
            successorsIds.add(fEntry.successor);
            successors.add(fEntry);
          }
    }
    for(var finger of successors) {
      if(finger.successor != null
          && ElementOfInterval(new NodeID(finger.successor), global.nodeID[0], nodeID))
          return this.getNode(finger.successor);
    }
    return null;
  }
  reset() {
    this.successors.clear();
    this.predecessors.clear();
    for(var fEntry of this.ftable) {
      fEntry.successor = null;
      fEntry.valid = false;
    }
  }
  AttachFinger() {
    const NB_FINGERS = 16;
    //Not implemented yet
    out.warning('Attach to fingers not implemented yet.')
  }
  isFinger(fingerID) {
    for(var fEntry of this.ftable) {
      if(fEntry.nodeState == exports.NodeState.unknown) {
        if(ElementOfInterval(new NodeID(fEntry.id), global.nodeID[0], fingerID, true)) {
          return fEntry;
        }
      } else {
        if(ElementOfInterval(fingerID, new NodeID(fEntry.id), new NodeID(fEntry.successor))) {
          return fEntry;
        }
      }
    }
    return null;
  }
  addFinger(fingerID, state) {
    if(global.userConf.global.modeClient == true)
      return;
    for(var fEntry of this.ftable) {
      if(!this.fingerSuccessors.has(fEntry.successor))
        this.fingerSuccessors.add(fEntry.successor);
      if(fEntry.nodeState == exports.NodeState.unknown) {
        if(ElementOfInterval(new NodeID(fEntry.id), global.nodeID[0], fingerID, true)) {
          fEntry.lastSuccessfullFinger = new Date(); //TODO
          fEntry.nodeState = state;
          fEntry.pinging = false;
          fEntry.successor = fingerID.id;
          fEntry.valid = true;
        }
        else if(fEntry.nodeState == exports.NodeState.attached && state ==  exports.NodeState.updates_received ) {
          fEntry.nodeState = state;
        }
        else {
          if(ElementOfInterval(fingerID, new NodeID(fEntry.id), new NodeID(fEntry.successor))) {
            fEntry.lastSuccessfullFinger = new Date(); //TODO
            fEntry.nodeState = state;
            fEntry.pinging = false;
            fEntry.successor = fingerID.id;
            fEntry.valid = true;
          }
        }
      }
    }
  }
  /**
   * Function called when receiving an UpdateReq
   */
  merge(originator, updateReq, forceSendUpdate) {
    //try {
      if(!this.isAttached(originator))
          out.debug('A none-attached node sent an update request to this node (' + originator.id + ')');
      var totalUpdateList = new Set();
      var validSuccessors = new Set();
      var validPredecessors = new Set();
      if(this.leavedNodes.size > 0)
      {
        if(!this.leavedNodes.has(originator.id))
          totalUpdateList.add(originator.id);
        for(var node of updateReq.successors) {
          if(!this.leavedNodes.has(node)) {
            validSuccessors.add(node);
            totalUpdateList.add(node);
          }
        }
        for(var node of updateReq.predecessors)
        {
          if(!this.leavedNodes.has(node)) {
            validPredecessors.add(node);
            totalUpdateList.add(node);
          }
        }
      } else {
        totalUpdateList.add(originator.id);
        for(var node of updateReq.successors)
          totalUpdateList.add(node);
        for(var node of updateReq.predecessors)
          totalUpdateList.add(node);
      }
      if(global.modeClient == true) {
        if(global.AP != null)
        {
          var nodeID = global.AP;
          for(id of totalUpdateList)
          {
            if(this.ElementOfInterval(new NodeID(id), new NodeID(global.nodeID[0]), new NodeID(nodeId)))
              nodeID = id;
          }
          if(nodeID != global.nodeID[0].id && nodeID != global.AP) {
            var state = this.getNodeState(nodeID);
            if(state == 0x0) {
              out.debug('Found a new admitting peer '+nodeID+' via '+originator.id);
              //TODO attach request to this node
            }
          }
        }
      }

      for(var id of totalUpdateList) {
        if(id != originator.id) {
          var value = this.tryGetValue(id);
          if(value) {
            if(this.isAttached(originator) && value.id != originator.id) {
              this.learnedFromTable.delete({id: id, originator: originator.id});
              this.learnedFromTable.add({id: id, originator: originator.id});
            }
          } else {
            this.learnedFromTable.add({id: id, originator: originator.id});
          }
        }
      }
      for(var node of this.successors)
        totalUpdateList.add(node);
      for(var node of this.predecessors)
        totalUpdateList.add(node);

      //Remove local ID
      for(var i of totalUpdateList)
        if(i == global.nodeID[0].id)
          totalUpdateList.delete(i);

      var newPredecessors = this.neighborsFromTotal(totalUpdateList, false);
      var newSuccessors = this.neighborsFromTotal(totalUpdateList, true);

      for(var node of this.leavedNodes)
      {
        if(newPredecessors.has(node))
          newPredecessors.delete(node);
        if(newSuccessors.has(node))
          newSuccessors.delete(node);
      }
      var isThereChangement = false;
      if(this.isChangedList(this.predecessors, newPredecessors)
          || this.isChangedList(this.successors, newSuccessors))
          {
            isThereChangement = true;
          }
      this.predecessors = newPredecessors;
      this.successors = newSuccessors;

      if(isThereChangement || forceSendUpdate)
      {
        out.debug('Merge: new approved neighbors, send updates to all.');
        this.sendUpdateToAllNeighbors();
      }


//    } catch(err) {
  //    out.error('merge(): '+err);
    // }

  }
  isChangedList(oldList, newList) {
    if(oldList.size != newList.size)
      return true;
    for(var i=0; i<oldList.size; i++)
    {
      if(oldList[i] != newList[i])
        return true;
    }
    return false;
  }
  neighborsFromTotal(total, isSuccessors) {
    var newList = [];

    for(var node of total)
    {
      if(node == global.nodeID[0])
        continue;
      if(newList.length == 0)
      {
        newList.push(node);
        // continue;
      }
      var fInserted = false;

      for(var i = 0; i < newList.length; i++)
      {
        if(isSuccessors) {
          if(ElementOfInterval(new NodeID(node), i == 0 ? global.nodeID[0] : new NodeID(newList[i-1]), new NodeID(newList[i])))
          {
            newList.splice(i,0,node);
            fInserted = true;
            break;
          }
        } else {
          if(ElementOfInterval(new NodeID(node), new NodeID(newList[i]), i == 0 ? global.nodeID[0] : new NodeID(newList[i-1])))
          {
            newList.splice(i,0,node);
            fInserted = true;
            break;
          }
        }
      }
      if(!fInserted) {
        newList.push(node);
      }
    }
    if(newList.length > CACHE_SIZE)
    {
      newList.length = CACHE_SIZE;
    }
    return new Set(newList);
  }

  attachToAllNeighbors() {
    var totalAttachList = new Set();
    for(var node of this.successors)
      totalAttachList.add(node);
    for(var node of this.predecessors)
      totalAttachList.add(node);

    for(var nodeID of totalAttachList)
    {
      if(!global.connectionManager.getConnection(new NodeID(nodeID)))
      {
        out.info('Starting Attach procedure with '+nodeID);
        if(global.connectionManager.connections.length == 0) {
          out.warning('Unable to start Attach Procedure : no active connections fount! Restarting the bootstrapping...');
        }
        //if AP is connected, use it
        var conn = global.connectionManager.getConnection(new NodeID(global.AP));
        var id = new NodeID(global.AP);
        if(!conn) {
          conn = global.connectionManager.connections[0].socket;
          id = global.connectionManager.connections[0].stack.id;
        }
          //[id, new ResourceID(addNodeID(t.nodeID.id))]
        global.topology.AttachService.attachTo(conn, [new ResourceID(nodeID)], true);
      } else {
        out.info('Already attached to '+nodeID);
        this.addNeighbor(new NodeID(nodeID), null);
      }
    }

  }
  sendUpdateToAllNeighbors() {
    if(!this.isAttachedToAllNeighbors())
    {
      out.debug('Not attached to all neighbors: first send attach.');
      this.attachToAllNeighbors();
    }
    if(!global.joined && !global.isOverlayInitiator)
    {
      return;
    }
    try {
      var totalUpdateList = new Set();
      for(var node of this.successors)
        totalUpdateList.add(node);
      for(var node of this.predecessors)
        totalUpdateList.add(node);
      for(var neighbor of totalUpdateList)
      {
        if(neighbor != null)
        {
          if(this.isAttached(new NodeID(neighbor)))
          {
            var join = new UpdateAnswer();
            let req = global.topology.messageBuilder.newMessage(join, [new NodeID(neighbor)]);
            global.connectionManager.sendMessage(global.connectionManager.getConnection(new NodeID(neighbor)), req);
          }
        }
      }
    } catch(err) {
      console.log(err);
    }
  }
  leave(msg) {
    var updateNeeded = false;
    var wasAdmittingPeer = false;
    var evaluateReplicas = false;
    var leaveReq = msg.content.message_body;
    this.setNodeState(leaveReq.id, 0);
    if(global.AP && global.AP == leaveReq.id)
    {
      global.AP = null;
    }
    if(this.successors.has(leaveReq.id))
    {
      var index = Array.from(this.successors).indexOf(leaveReq.id);
      this.successors.delete(leaveReq.id);
      this.addLeavedNode(leaveReq.id); //Remember it for 5 minutes (RFC)
      updateNeeded = true;
      out.info('Deleted '+leaveReq.id+' from successors.');
    }
    if(this.predecessors.has(leaveReq.id))
    {
      var index = Array.from(this.predecessors).indexOf(leaveReq.id);
      this.predecessors.delete(leaveReq.id);
      this.addLeavedNode(leaveReq.id); //Remember it for 5 minutes (RFC)
      updateNeeded = true;
      out.info('Deleted '+leaveReq.id+' from predecessors.');
    }
    for(var entry of this.ftable)
    {
      if(entry.successor == leaveReq.id)
      {
        entry.successor = null;
        entry.valid = false;
      }
    }
    for(var entry of this.rtable)
    {
      if(entry.id == leaveReq.id)
      {
        this.rtable.delete(entry);
        this.addLeavedNode(leaveReq.id); //Remember it for 5 minutes (RFC)
        updateNeeded = true;
      }
    }

    if(updateNeeded && !global.clientMode)
    {
      this.sendUpdateToAllNeighbors();
    }
    if(wasAdmittingPeer)
    {
      out.debug('Lost admitting peer connection.');
    }
    return wasAdmittingPeer;
  }
  addLeavedNode(id) {
    for(var item of this.leavedNodes)
    {
      if(item.id == id)
        return;
    }
    this.leavedNodes.add(id);
  }
  isAttachedToAllNeighbors() {
    for(var suc of this.successors)
    {
      if(!this.isAttached(new NodeID(suc)))
        return false;
    }
    for(var pre of this.predecessors)
    {
      if(!this.isAttached(new NodeID(pre)))
        return false;
    }
    return true;
  }
  getNeighbors() {
    return this.rtable;
  }
  getApproved(inputList) {
    var approvedList = new Set();
    for(var val of inputList)
    {
      if(this.gotUpdatesFrom(val))
        approvedList.add(val);
    }
    return approvedList;
  }
}
