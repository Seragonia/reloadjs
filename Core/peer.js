'use strict';

//Dependencies
const fs        = require('fs');
const tls       = require('tls');
const dns       = require('dns');
const nodeIPC   = require('node-ipc');
const net       = require('net');
const https     = require('https');
const http      = require('http');
const xmlParser = require('xml-parser');
const out       = require("../utils/reloadTraces.js");
const Bootstrap = require('./bootstrap.js');
const cert      = require('../Crypto/X509Utils.js');
const argv      = require('minimist')(process.argv.slice(2));

//RELOAD services used
const Topology          = require("../Topology/DefaultTopologyPlugin.js").DefaultTopologyPlugin;
const Storage           = require("../Services/Storage/storage.js");
const Instance          = require('./instance.js');
const ConnectionManager = require('./ConnectionManager.js').ConnectionManager;
const RoutingTable      = require('../Routing/CHORDRoutingTable.js').CHORDRoutingTable;
const NodeListener      = require('./NodeListener.js').NodeListener;

module.exports = class Peer {
  constructor(conf) {
    this.instance       = new Instance();
    this.conf           = conf;
    this.topology       = null;
    this.storage        = null;
    this.localAddress   = null;
  }

  run() {
    //Getting overlay configuration
    //Depends of the config file
    var address;
    var self = this;
    if(this.conf.global.forceLocalConfig == true)
    { //Read the local config file
      try {
        this.instance.setXMLObject(xmlParser(String(
            fs.readFileSync('./config-reload-selfsigned.xml', 'utf8'))));
        out.info("Self signed certificate sucessfully loaded.");
        self.checkOverlay();
      } catch(err) {
        out.error("Failed to load the local certificate. Error : " + err);
        return -1;
      }
    }else{ //getting config file from overlay name + .well-known/reload-config
      //Try with https §4.6.1 RFC 6940 (Try only once)
      const options = {
        hostname: this.conf.global.overlayName,
        port: 8080, // This should be 443 in the release
        path: '/.well-known/reload-config',
        method: 'GET',
        rejectUnauthorized: false
      };
      var data = "";
      const req = https.request(options, (resp) => {
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          self.instance.setXMLObject(xmlParser(String(data)));
          out.info("Overlay configuration loaded.");
          self.checkOverlay();
        });
      });

      req.on("error", (err) => {
        out.error("Failed to download overlay configuration file (" + err
        + ").");
        if(this.conf.enroll.enableHTTP == true)
        {
          out.warning("Trying without HTTPS... (not in the RFC!)");
          //Not in the RFC but this implementation handles the download
          //with HTTP mode (useful for tests)
          http.get("http://" + this.conf.global.overlayName + "/.well-known/reload-config",
            (res) => {
              const { statusCode } = res;
              const contentType = res.headers['content-type'];
              var body = '';
              res.on('data', function(d) {
                body += d;
              });
              res.on('end', function(d) {
                var overlayConfig = xmlParser(String(body));
                if(overlayConfig.root == undefined)
                {
                  out.error("Failed to load the configuration file without HTTPS. URL is correct but"
                            +" the file downloaded isn't a valid XML file. Received: "+ contentType);
                  return;
                }
                self.instance.setXMLObject(overlayConfig);
                out.info("Overlay configuration loaded.");
                self.checkOverlay();
              });
              if(statusCode != 200) {
                out.error("Failed to load the configuration file without HTTPS. Error code: "+ statusCode);
                return;
              }
            }).on('error', (e) => {
              out.error("Failed to download the configuration file in HTTPS mode. " + e);
              return;
            });
        } else {
          return;
        }
      });

      req.end();
    }
  }

  checkOverlay() {
    out.info("Parsing the configuration file...");
    if(this.instance.parseConfig()) return;
    //Launch global services
    this.startServices();
  }

  startServices() {
    //Core Service
    global.listener = new NodeListener(this.localAddress);
    global.turns = [];
    var bootstrap = this.initBootstrap();
    this.initWeb();

    //First, create the Topology object (singleton)
    this.topology = new Topology(new RoutingTable());
    this.topology.init(
      global.instance,
      new ConnectionManager(),
      global.listener.MessageRouter,
      global.listener.MessageRouter.messageBuilder,
      global.listener.MessageHandler
    );
    this.topology.start(bootstrap);
  }

  initBootstrap() {
    out.info("Starting the bootstrapping.");
    var bootstrap = new Bootstrap(this.instance);
    //First checks if there is not already a cached list of
    //peer for this overlay (RFC6940 §11.4.)
    if(this.instance.cache.exists === true)
    {
      out.info("Try connecting to the overlay using the cached bootstrap peer list...");
    }
    else
    {
      bootstrap.setBootstrapPeerList(this.instance.config['bootstrap-node']);
    }
    bootstrap.setListenerPort(Number.isInteger(argv['port']) ? argv['port'] : JSON.parse(fs.readFileSync('./utils/config.json', 'utf-8')).global.listenport);
    bootstrap.setListenerAddress(this.localAddress);
    bootstrap.setLocalCert(this.instance.savedInstance.localCertificate);
    bootstrap.setLocalKey(this.instance.savedInstance.keys.publicKey);
    bootstrap.setLocalAddress(this.instance.savedInstance.localAddress);
    bootstrap.setInitiator((argv['first']) ? true : false);
    bootstrap.setClientMode((argv['client']) ? true : false);
    bootstrap.setLocalNodeId(this.instance.savedInstance.nodeIDs[0]);
    return bootstrap;
  }

  initWeb() {
    //const
    setInterval(function(){
      console.log('==============');
      console.log('Routing Table :\nSuccessors: ', global.topology.routing.successors);
      console.log('Predecessors: ', global.topology.routing.predecessors);
      console.log('Connections: ', global.connectionManager.connections.length);
      console.log('==============');
    }, 2000);
    var express = require('express');
    var app = express();
    var server = require('http').createServer(app);
    var io = require('socket.io')(server);
    app.use(express.static(__dirname + '/web'));
    app.get('/', function(req, res,next) {
        res.sendFile(__dirname + '/web/index.html');
    });
    io.on('connection', function(client) {
      console.log('Client connected...');
      global.clientsWeb.push(client);
      client.on('join', function(data) {
          console.log(data);
      });
      setInterval(function(){
        var c = [];
        //TODO : adapt with chord
        var infos = {
          nodeid: global.nodeID[0].id,
          interface: argv['i'],
          ips: global.ips,
          selfsigned: true,
          neighbors: {
            successors: Array.from(global.topology.routing.successors),
            predecessors: Array.from(global.topology.routing.predecessors)
          },
          overlayname: global.instance.instanceName
        };
        client.emit('update', infos);
      }, 1000);
  });

    server.listen(10000+(Number.isInteger(argv['port']) ? argv['port'] : JSON.parse(fs.readFileSync('./utils/config.json', 'utf-8')).global.listenport));
  }

  disconnect() {
    //TODO : disconnect from overlay
  }
}
