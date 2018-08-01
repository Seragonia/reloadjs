'use strict';
const fs   = require('fs');
const out  = require('../utils/reloadTraces.js');
const argv = require('minimist')(process.argv.slice(2));
const maxPeerToCache = 10;

//Class which manages the bootstrap node list cached for a given overlay name
//Note : The choosing peer part is not in the RFC6940
module.exports = class BootstrapCache {
  constructor(overlayName) {
    this.overlayName = overlayName;
    this.cache = [];
    var port = Number.isInteger(argv['port']) ? argv['port'] : JSON.parse(fs.readFileSync('./utils/config.json', 'utf-8')).global.listenport;
    this.path = "./Core/cache/boot-"+overlayName+"-"+port+".json";
    //Check first if there is already a json file cache for this overlay
    if(fs.existsSync(this.path))
    {
      var c = JSON.parse(fs.readFileSync(this.path));
      this.cache = c == {} ? [] : JSON.parse(fs.readFileSync(this.path));
      if(this.cache !== undefined)
      {
        out.info("Cache found for the "+overlayName+" overlay.");
        this.exists = true;
      }
      else
      {
        out.info("No cache found for the "+overlayName+" overlay. Creating it...");
        fs.writeFileSync(this.path, JSON.stringify([]), 'utf8');
        out.info("Cache created!");
        this.exists = false;
        this.cache = [];
      }
    }
    else
    {
      out.info("No cache found for the "+overlayName+" overlay. Creating it...");
      fs.writeFileSync(this.path, JSON.stringify([]), 'utf8');
      out.info("Cache created!");
      this.exists = false;
      this.cache = [];
    }
  }
  addPeer(peer) {
    if(this.cache.length >= maxPeerToCache)
    {
      out.info("Cache list is already full.");
    }
    else
    {
      this.cache.push(peer);
    }
    this.save();
  }
  getPeers() {
    return this.cache;
  }
  save() {
    if(fs.existsSync(this.path))
    {
      fs.writeFileSync(this.path, JSON.stringify(this.cache), (err) => {
        if(err) throw err;
        out.debug("Cache file saved : "+this.overlayName+".json");
      })
    } else {
      out.error('Cache file path not valid, perhaps removed?');
    }
  }
}
