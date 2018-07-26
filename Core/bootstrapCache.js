'use strict';
const fs  = require('fs');
const out = require('../utils/reloadTraces.js');
const maxPeerToCache = 10;

//Class which manages the bootstrap node list cached for a given overlay name
//Note : The choosing peer part is not in the RFC6940
module.exports = class BootstrapCache {
  constructor(overlayName) {
    this.overlayName = overlayName;
    //Check first if there is already a json file cache for this overlay
    if(fs.existsSync("./cache/"+overlayName+".json"))
    {
      this.cache = fs.readFileSync("./cache/"+overlayName+".json");
      if(this.cache['list'] !== undefined)
      {
        out.info("Cache found for the "+overlayName+" overlay.");
        this.exists = true;
      }
      else
      {
        out.info("No cache found for the "+overlayName+" overlay.");
        this.exists = false;
        this.cache = {
          list: []
        }
      }
    }
    else
    {
      out.info("No cache found for the '"+overlayName+"' overlay.");
      this.exists = false;
      this.cache = {
        list: []
      }
    }
  }
  addPeer(peer) {
    if(this.cache['list'].length >= maxPeerToCache)
    {
      out.info("Cache list is already full.");
    }
    else
    {
      this.cache['list'].push(peer);
    }

  }
  getPeers() {
    return this.cache.list;
  }
  save() {
    fs.write("./cache/"+this.overlayName+".json", this.cache, (err) => {
      if(err) throw err;
      out.debug("Cache file saved : "+this.overlayName+".json");
    })
  }
}
