'use strict';

const NodeID = require('../Transport/messages/header/NodeID.js');
/**
 * This method does not really convert a hash to an Int because of the
 * bit limitations of Javascript. Collisions are possible but it is not
 * a problem.
 */
module.exports.convertNodeID = function(nodeID) {
  var result = 0;
  for(var i = nodeID.id.length-1; i>=0; i--)
    result += nodeID.id.charCodeAt(i)*(7**(nodeID.id.length - i));
  return result;
}

module.exports.getDistance = function(node1, node2) {
  return Math.abs(exports.convertNodeID(node1) - exports.convertNodeID(node2));
}

module.exports.ElementOfInterval = function(id, start, end, endIncluded = false) {
  var id_ = module.exports.convertNodeID(id);
  var start_ = module.exports.convertNodeID(start);
  var end_ = module.exports.convertNodeID(end);
  if(id_ == end_ && endIncluded)
    return true;
  else {
    if(start_ == end_)
      return true;
    else {
      if(start_ > end_)
      {
        if(id_ > start_ || id_ < end_)
          return true;
      } else {
        if(id_ > start_ && id_ < end_)
          return true;
      }
    }
    return false;
  }
}

module.exports.Sort = function(set) {
  var tuple = [];
  for(var id of set) {
    tuple.push({id: id, value:  module.exports.convertNodeID(new NodeID(id))});
  }
  function compare(a,b) {
    if(a.value < b.value)
      return -1;
    if(a.value > b.value)
      return 1;
    return 0;
  }
  tuple.sort(compare);
  return new Set(tuple);
}

//This function is used to increment a hash
module.exports.addNodeID = function(nodeID) {
  var id = nodeID;
  var rest = 0;
  var lastLetter = 0;
  var i = 0;
  while(!rest)
  {
    i++;
    lastLetter = id.charCodeAt(id.length-i);
    if(lastLetter > 96) //letter
     lastLetter -= 87;
    if(lastLetter > 47 && lastLetter < 58) //number
      lastLetter -= 48;
    var rest = (lastLetter + 1) % 16;
    if(rest < 10)
      id = setCharAt(id, id.length-i, String.fromCharCode(rest+48));
    else if(rest>9)
      id = setCharAt(id, id.length-i, String.fromCharCode(rest+87));
    if(i == id.length) return id;
  }
  return id;
}

function setCharAt(str, i, char) {
  return str.substr(0,i) + char + str.substr(i+1);
}
