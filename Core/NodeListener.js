'use strict';
/*
 * Global class that runs the TCP listener.
 * It is used by the ConnectionManager to listen for incoming messages
 * It has a list of opened connections
 */
const out               = require('../utils/reloadTraces.js');
const tls               = require('tls');
const pki               = require('node-forge').pki;
const MessageRouter     = require('../Transport/MessageRouter.js').MessageRouter;
const MessageHandler    = require('../Topology/MessageHandler.js').MessageHandler;
const ConnectionManager = require('./ConnectionManager.js').ConnectionManager;
const MessageDispatcher = require('./MessageDispatcher.js').MessageDispatcher;

module.exports.NodeListener = class NodeListener {
  constructor(addr) {
    this.addr = addr;
    this.connections = new ConnectionManager();
    this.MessageHandler = new MessageHandler();
    this.MessageDispatcher = new MessageDispatcher();
    this.MessageRouter = new MessageRouter(global.instance, global.nodeID);
    this.server = null;
    this.isBootstrap = false;
  }
  init(privateKey, localCertificate, port) {
    this.port = port;
    var options = {
      key: global.localPrivateKey,
      cert: global.localCertificate.cert,
      requestCert: false,
      rejectUnauthorized: false
    }
    let t = this;
    this.server = tls.createServer(options, (socket) => {
      socket.on('data', (data) => {
        if(data.toString() == "close")
        {
          global.connectionManager.removeConnection(socket);
          socket.destroy();
        } else {
          t.MessageHandler.handleMessage(socket, data);
        }
      });
      socket.on('close', () => {
        global.connectionManager.removeConnection(socket);
        socket.destroy();
      });
      socket.on('error', (err) => {
        out.debug(err);
        global.connectionManager.removeConnection(socket);
        socket.destroy();
      });
      socket.on('end', () => {
        out.debug('Disconnected');
      });
    }).listen(this.port, () => {
      out.debug('Node listener launched.');
    });
    this.server.on('error', (err) => {
      out.debug(err);
    });
    this.server.on('close', () => {
      out.debug('Disconnected');
    });
    this.server.on('end', () => {
      out.debug('Disconnected');
    });
  }
  getConnectionManager() {
    return this.connections;
  }
  getMessageDispatcher() {
    return this.messageDispatcher;
  }
  getServerAddress() {
    return this.server.addr;
  }
  setUpTURN() {
    out.info('Starting TURN server ('+this.addr+':3478)');
    var Turn = require('node-turn');
    var server = new Turn({
      // set options
      listeningIps: [this.addr],
      authMech: 'long-term',
      credentials: {
        username: "password"
      }
    });
    server.start();
  }
}
