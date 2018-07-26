'use strict';
/*
 * Class used to respond to a received request.
 */
const out         = require('../utils/reloadTraces.js');
const ContentType = require('../Transport/messages/content/ContentType.js').ContentType;
const JoinAnswer  = require('../Transport/messages/content/JoinAnswer.js');
const getNodeIdFromCertificate = require('../Crypto/X509Utils.js').getNodeIdFromCertificate;
const NodeID = require('../Transport/messages/header/NodeID.js');
const UpdateAnswer = require('../Transport/messages/content/UpdateAnswer.js');
const PingAnswer = require('../Transport/messages/content/PingAnswer.js');

module.exports.MessageDispatcher = class MessageDispatcher {
  constructor() {
    global.ContentType = ContentType;
  }
  handleMessageType(type, message) {
    //If request, handle it
    let distID = getNodeIdFromCertificate(message.secBlock.certificates[0]);
    if(type % 2 !== 0)  { //request message are not mutliple of 2
      out.debug('Request received : ' + ContentType.getContentType(type));
      switch(type)
      {
        case 0x3: //AttachRequest
        {
          global.topology.AttachService.handleAttachRequest(message);
          break;
        }
        case 0xF: //JoinRequest
        {
          var join = new JoinAnswer(global.nodeID[0]);
          let req = global.topology.messageBuilder.newMessage(join, [new NodeID(distID)]);
          global.connectionManager.sendMessage(global.connectionManager.getConnection(new NodeID(distID)), req);
          //Send an update answer if previously requested
          if(global.topology.AttachService.updateAfterConnection.has(distID))
          {
            out.debug('Send Update Answer (with the routing table).');
            var join = new UpdateAnswer();
            let req2 = global.topology.messageBuilder.newMessage(join, [new NodeID(distID)]);
            global.connectionManager.sendMessage(global.connectionManager.getConnection(new NodeID(distID)), req2);
            global.topology.AttachService.updateAfterConnection.delete(distID);
          }
          //Add in routing table
          global.topology.routing.addNeighbor(new NodeID(distID));
          global.topology.routing.setNodeState(new NodeID(distID), 2);
          break;
        }
        case 0x11: //LeaveRequest
        {
          out.info('LeaveRequest received ('+distID+').');
          global.topology.routing.leave(message);
          global.connectionManager.removeConnection(global.connectionManager.getConnection(new NodeID(distID)));
          break;
        }
        case 0x13: //UpdateRequest
        {
          out.debug('Sending back UpdateReqAns (with the routing table).');
          var join = new UpdateAnswer();
          let req3 = global.topology.messageBuilder.newMessage(join, [new NodeID(distID)]);
          global.connectionManager.sendMessage(global.connectionManager.getConnection(new NodeID(distID)), req3);
          break;
        }
        case 0x17: //PingRequest
        {
          out.debug('Sending back ping.');
          var ping = new PingAnswer();
          let req4 = global.topology.messageBuilder.newMessage(ping, [new NodeID(distID)]);
          global.connectionManager.sendMessage(global.connectionManager.getConnection(new NodeID(distID)), req4);
          break;
        }
      }
    }else{ //response message are mutliple of 2
      //If response, first check if an associated request has been
      //previously sended. In this case, MessageRouter will
      out.debug('Answer received : ' + ContentType.getContentType(type));
      switch(type)
      {
        case 0x4: //AttachAnswer
        {
          global.topology.AttachService.processAttachAnswer(message);
          break;
        }
        case 0x10: //JoinAnswer
        {
          //Add in routing Table
          global.topology.routing.addNeighbor(new NodeID(distID));
          global.topology.routing.setNodeState(new NodeID(distID), 2);
          global.topology.joined = true;
          break;
        }
        case 0x12: //LeaveAnswer
        {
          out.info('LeaveAnswer received ('+distID+').');
          break;
        }
        case 0x14: //UpdateAnswer
        {
          var sendUpdate = false;
          if(global.AP && distID == global.AP && !global.isOverlayInitiator && !global.joined)
            if(!global.topology.routing.isWaitForJoinAns(new NodeID(distID)))
            {
              //Joining is complete here
              global.joined = true;
              out.info('Joining complete!');
              sendUpdate = true;
            }
          global.topology.routing.merge(new NodeID(distID), message.content.message_body, sendUpdate);
          break;
        }
        case 0x18: //PingAnswer
        {
          out.debug('Received PingAnswer.');
          for(var entry of global.topology.pendingPing)
          {
            if(entry.id == distID)
            {
              entry.cpt = 0;
            }
          }
          break;
        }
      }
    }
  }
}
