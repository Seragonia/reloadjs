'use strict';
/*
 * Class used to create Attach requests and responses
 */
const AttachMessageBuilder = require('../Transport/messages/content/AttachMessage.js').AttachMessageBuilder;
const MessageBuilder = require('../Transport/messages/messageBuilder.js');
const getNodeIdFromCertificate = require('../Crypto/X509Utils.js').getNodeIdFromCertificate;
const out = require('../utils/reloadTraces.js');
const ICE = require('../Transport/ice/ICE.js').ICE;

module.exports.AttachService = class AttachService {
  constructor() {
    this.msgRouter = global.topology.messageRouter;
    this.connMgr = global.topology.connectionManager;
    this.pendingRequests = new Set();
    this.answeredrequests = new Set();
    this.pcs = [];
    this.updateAfterConnection = new Set();
  }
  /**
   * Function used to perform an Attach request to directly connect
   * to another peer, potentially using ICE.
   */
  attachTo(connection, destList, isrequestUpdate = false) {
    let b = new AttachMessageBuilder();
    let conn = connection;
    let dest = destList;
    let t = this;
    var onCandidatesGathered = function(pc) {
      b.setCandidates(pc.localDescription.sdp);
      var attachMessage = b.buildRequest();
      var builder = new MessageBuilder(global.topology.instance, global.nodeID);
      let req = builder.newMessage(attachMessage, dest);
      //Add message in pending requests
      t.sendRequest(conn, req, pc);
    }
    ICE.getSDPOffer(onCandidatesGathered);
    b.setSendUpdate(isrequestUpdate);
  }
  /**
   * Parse and check an Attach answer received.
   */
  processAttachAnswer(ans) {
    //Check if in pending list
    if(this.pendingRequests.has(ans.header.transaction)) {
      out.info('Attach Answer received from '+getNodeIdFromCertificate(ans.secBlock.certificates[0])+'.');
      //Select candidate
      var answer = {
        type: 'answer',
        sdp: ans.content.message_body.candidates
      };
      ICE.connect(this.pcs[ans.header.transaction], answer);
      this.pendingRequests.delete(ans.header.transaction);
    } else {
      out.info('Unwanted AttachAnswer received, dropping...');
    }
  }
  handleAttachRequest(req)
  {
    var nodeID = getNodeIdFromCertificate(req.secBlock.certificates[0]);
    if(req.content.message_body.sendUpdate == true)
    {
      global.topology.AttachService.updateAfterConnection.add(req.header.via_list.list[0].id);
    }
    out.info('Attach Request received from '+getNodeIdFromCertificate(req.secBlock.certificates[0])+'.');
    // No pending request, just send the answer
    if(!this.pendingRequests.has(req.header.transaction)) {
      out.debug('Sending local candidate list...');;
      this.sendAnswer(req);
      return;
    } else {
      out.debug('Attach request already sent!');
      return;
    }
    // Pending request already answered
    if(!this.answeredrequests.has(nodeID)) {
      out.debug('Attach already in progress!');
      return;
    }
    this.sendAnswer(req);
  }

  sendRequest(connection, req, pc) {
    this.pendingRequests.add(req.header.transaction);
    this.pcs[req.header.transaction] = pc;
    global.connectionManager.sendMessage(connection, req);
  }
  sendAnswer(req) {
    let b = new AttachMessageBuilder();
    let r = req;
    let t = this;
    var onAnswerComputed = function(sdp) {
      out.debug('Sending back the ICE answer SDP object');
      b.setCandidates(sdp.localDescription.sdp);
      let attachAnswer = b.buildAnswer();
      if(req.content.sendUpdate)
        this.updateAfterConnection.add(nodeID);
      let header = req.header;
      // Send attach answer through the same neighbor
      global.topology.messageRouter.sendAnswer(header, attachAnswer);
    }
    ICE.getSDPAnswer(req.content.message_body.candidates, onAnswerComputed);
  }
}
