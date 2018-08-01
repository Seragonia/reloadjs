'use strict';

//Dependencies
const fs      = require("fs");
const out     = require("./utils/reloadTraces.js");
const Peer    = require('./Core/peer.js');
const argv    = require('minimist')(process.argv.slice(2));
const os      = require('os');
const ifaces  = os.networkInterfaces();
const crypto = require('crypto');
/******
 * Usage : node startup.js -i interface [--overlay-name  interfaceName [--port portNumber
 * This file simply uses the reload project as a module and run an instance of it
 ******/

 process.on('SIGINT', function() {
   if(global.connectionManager)
   {
     global.connectionManager.removeAll();
   }
   process.exit();
 });

//Entry point class
class RELOADjs {
  constructor() {
    global.clientsWeb = [];
    global.ips = [];
    this.conf = JSON.parse(fs.readFileSync("./utils/config.json"));
    global.userConf = this.conf;
    this.peer = new Peer(this.conf);
    this.instanceConfig = JSON.parse(fs.readFileSync("./utils/clientConfig.json", "utf8"));
    out.setConfig(this.instanceConfig);
    this._isStarted = false
  }
  run() {
    this._isStarted = true;
    out.info("Starting RELOADjs...");
    this.peer.run();
  }
}

var reloadInstance = new RELOADjs();

//If asked, erase the last instance backup
if(argv['e']) {
  if(fs.existsSync('./Core/cache/'+argv['overlay-name']+'-'+(argv['port'] ? argv['port'] : 6084)+'.json'))
  {
    fs.unlink('./Core/cache/'+argv['overlay-name']+'-'+(argv['port'] ? argv['port'] : 6084)+'.json', (err) => {
      if(err) throw err;
      out.info('Sucessfully deleted last overlay instance backup.');
    });
  }
}

//Verifying if the given interface network is valid
if(!argv['i'] || argv['i']=="") {
  out.error("You must launch RELOADjs with a -i (network interface) parameter. Please select one interface name :");
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if('IPv4' === iface.family)
        out.info(ifname + ":" + iface.address);
    });
  });
} else {
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if(ifname === argv['i'] && 'IPv4' === iface.family)
      {
        reloadInstance.peer.localAddress = iface.address;
        global.addr = iface.address;
        reloadInstance.run();
        return;
      }
    });
  });
}
