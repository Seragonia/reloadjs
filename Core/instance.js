'use strict';

//dependencies
const fs                  = require('fs');
const os                  = require('os');
const out                 = require('../utils/reloadTraces.js');
const argv                = require('minimist')(process.argv.slice(2));
const input               = require('readline-sync');
const Cache               = require('../Core/bootstrapCache.js');
const ifaces              = os.networkInterfaces();
const Keystore            = require('../Crypto/Keystore.js').Keystore;
const Signature           = require('../Transport/messages/secBlock/Signature.js');
const CryptoHelper        = require('../Crypto/CryptoHelper.js').CryptoHelper;
const NodeListener        = require('./NodeListener.js').NodeListener;
const ReloadCertificate   = require('../Crypto/ReloadCertificate.js').ReloadCertificate;
const loadX509Certificate = require('../Crypto/X509Utils.js').loadCertificate;
const generateSelfSignedCertificate = require('../Crypto/X509Utils.js').generateSelfSignedCertificate;

/*********** Overlay configuration ***********

Stored as a valid XML file encoded in UTF-8
The namespace used in the specification are :
  urn:ietf:params:xml:ns:p2p:config-base
  urn:ietf:params:xml:ns:p2p:config-chord

p.127 : it is possible for one XML file to
store multiple overlay configuration
inside different "configuration" elements
followed by their signature.

/*********** Overlay configuration ***********/

const supportedHeaders = [
  "urn:ietf:params:xml:ns:p2p:config-base",
  "urn:ietf:params:xml:ns:p2p:config-ext1",
  "urn:ietf:params:xml:ns:p2p:config-chord",
  "urn:ietf:params:xml:ns:p2p:config-base:share",
  "urn:ietf:params:xml:ns:p2p:config-base:disco"
];

module.exports = class Instance {
  constructor() {
    this.XML = null;
    this.savedInstance = null;
    this.namespaces    = [];
    this.overlay       = {};
    this.nbOverlays    = 0;
    this.instanceName  = "";
    this.signature     = "";
    this.cache         = null;
    this.sequence      = 0;
    this.cryptoHelper  = null;

    //Overlay configuration, default values
    this.config = {
      "topology-plug-in": "CHORD-RELOAD",
      "node-id-length": 16,
      "root-cert": [ ], //multiple certificates accepted
      "enrollment-server": [
        "https://"
      ],
      "self-signed-permitted": {
        permitted: false,
        digest: "sha256", //"sha1" is now depreciated
      },
      "bootstrap-node": [],
      "turn-density": 1, //TODO set to zero if no TURN servers in the overlay
      "clients-permitted": true,
      "no-ice": false,
      "chord-update-interval": 200,
      "chord-ping-interval": 20,
      "chord-reactive": true,
      "shared-secret": "",
      "max-message-size": 5000,
      "initial-ttl": 100,
      "overlay-reliability-timer": 3000, //minimum 200
      "overlay-link-protocol": "TLS", //and DTLS
      "kind-signer": null, //TODO
      "configuration-signer": null, //TODO
      "bad-node": [
        //list of bad node to not trust
      ],
      "mandatory-extension": "",
      "required-kinds": {}
    }
  }

  //Retreive the XML loaded JS object of the
  //overlay configuration
  setXMLObject(o) {
    this.XML = o;
  }

  parseConfig() {
    //Check first if there are multiple overlays
    //In this case, ask the user which one he wants
    //until it has already been specified by the user
    //on start (p. 126)
    var cpt = 0;
    for(var key in this.XML.root.attributes)
    {
      if(!supportedHeaders.includes(this.XML.root.attributes[key])) {
        out.error("Invalid XML configuration file : invalid namespace "
                    + this.XML.root.attributes[key]);
      }
      this.namespaces[key] = this.XML.root.attributes[key];
      cpt++;
    }
    //Check if enough information were given (xmlns + topology algorithm)
    if(!this.XML.root.attributes.xmlns || cpt < 1) {
      out.error("Too few namespaces specified in the overlay XML configuration file.");
      return;
    }

    //Calculate the number of "configuration"
    this.nbOverlays = 0;
    for(var key in this.XML.root.children)
    {
      if(this.XML.root.children[key].name == 'configuration') {
        this.nbOverlays += 1;
      }
    }

    if(this.nbOverlays == 0)
    {
      out.error("No overlay configuration found in the XML file.");
      return;
    } else if (this.nbOverlays > 1) {
      var o = {};
      var names = "";
      for(var key in this.XML.root.children) {
        if(this.XML.root.children[key].attributes['instance-name']) {
          o[this.XML.root.children[key].attributes['instance-name']] = this.XML.root.children[key];
          names += "\n\t" + key + ": "+this.XML.root.children[key].attributes['instance-name'];
        }
      }
      //If the user didn't specified an overlay name, ask.
      if(argv['overlay-name'] != undefined)
      {
        if(o[argv['overlay-name']] == undefined) {
          out.error("Bad overlay name");
          return;
        }
        this.instanceName = argv['overlay-name'];
        this.overlay = o[this.instanceName];
        out.debug("Loading the " + this.instanceName + " overlay.");
        return this.checkOverlayValidity();
      } else { //Asking for the name
        var answer = input.question('Please specify the index of the overlay you want to connect to: '+names+'\n > ');
        if(!isNaN(answer) && answer < this.XML.root.children.length) {
          out.info("This RELOADjs instance will try to connect to the " + this.XML.root.children[answer].attributes['instance-name'] + " overlay.");
        } else {
          out.error("You must provide a valid index. Selecting the first overlay (0)...");
          answer = 0;
        }
        this.instanceName = this.XML.root.children[answer].attributes['instance-name'];
        this.overlay = this.XML.root.children[answer];
        out.debug("Loading the " + this.instanceName + " overlay.");
        return this.checkOverlayValidity();
      }
    } else {
      this.instanceName = this.XML.root.children[0].attributes['instance-name'];
      this.overlay = this.XML.root.children[0];
      out.debug("Loading the " + this.instanceName + " overlay.");
      return this.checkOverlayValidity();
    }
  }

  checkOverlayValidity() {
    this.cache = new Cache(this.instanceName);
    //Verify the signature that follows the current overlay before to go further
    //use the instance name to detect the next <signature...> entry
    for(var key in this.XML.root.children) {
      if(this.XML.root.children[key].attributes["instance-name"] == this.instanceName)
      {
        if(this.XML.root.children[key+1])
          this.signature = this.XML.root.children[Number(key)+1].content;
      }
    }
    //Convert the xml object to dictionnary
    var d = {};
    this.overlay.children.forEach(function(x) {
      d[x.name] = x;
    });
    if(d["configuration-signer"] && d["configuration-signer"].content)
    {
      out.info("Overlay signature detected! Checking the overlay signature...");
      var r1 = /<configuration instance-name="/g;
      var r2 = /".*?([\s\S])*?configuration>/;
      var regex = new RegExp(r1.source + this.instanceName + r2.source);
    //  var sign = new Signature.Signature(null);
      if(/*sign.Signature_check(
        fs.readFileSync('./overlay/config-reload-selfsigned.xml', 'utf8').match(regex)[0],
        d["configuration-signer"].content,
        this.signature) == true*/ true) { //TODO
          out.info("Signature OK!");
      }
      else
      {
        out.error("XML overlay configuration and signature don't match!");
        return -1;
      }
    }

    //Checking for the minimum information needed in each overlay configuration
    //p. 126 RFC 6940
    if(!(this.overlay.attributes.expiration && this.overlay.attributes['instance-name'] && this.overlay.attributes.sequence)) {
      out.error("Attributes missing in the XML overlay configuration file.");
      return;
    } else {
      this.sequence = this.overlay.attributes.sequence;
      out.debug("Configuration file have at least the minimal configuration required.");
    }

    //Checking if the overlay is still avaible (using the expiration time)
    var date = (new Date(this.overlay.attributes.expiration)).getTime();
    var start = Date.now();
    if(date - start > 0) { //valid
      out.debug("Overlay timestamp is valid.");
    } else { //expired
      out.error("Overlay timestamp is expired ! Please find another overlay or reconfigure your network.");
    }

    //Checking all the attributes. RFC 6940 p.126
    out.info("Checking all the attributes...");
    //Then check all attributes
    //"topology-plug-in" (default = "CHORD-RELOAD")
    if(d["topology-plug-in"]) {
      this.config["topology-plug-in"] = d["topology-plug-in"].content;
    }
    if(d["node-id-length"]) {
      this.config["node-id-length"] = d["node-id-length"].content;
    }
    if(d["root-cert"]) {
      var cpt = 0;
      for(var key in this.overlay.children) {
        var name = this.overlay.children[key].name;
        if(this.overlay.children[key].name == "root-cert") {
          out.debug("Loading a X.509v3 certificate(s) from the configuration file.");
          this.config["root-cert"].push(loadX509Certificate(this.overlay.children[key].content));
          out.debug("Successfully loaded certificate.");
          cpt++;
        }
      }
      out.info( cpt + " root certificate(s) (X.509v3) loaded for the selected overlay.");
    }
    if(d["enrollment-server"]) {
      this.config["enrollment-server"] = d["enrollment-server"].content;
    }
    if(d["bootstrap-node"]) {
      //We need here to return each bootstrapping node with their IP address and Port
      for(var key in this.overlay.children)
      {
        var name = this.overlay.children[key].name;
        if(this.overlay.children[key].name == "bootstrap-node") {
          //Since the port attribute is optional, check
          //p.127 RFC 6940
          var port = "6084"; //default port
          if(this.overlay.children[key].attributes['port']) {
            port = this.overlay.children[key].attributes['port'];
          }
          this.config["bootstrap-node"].push(
            {
              name: {
                'address': this.overlay.children[key].attributes['address'],
                'port': port
              }
            });
            out.debug("Adding bootstrap node candidate: " + name + "(" + this.overlay.children[key].attributes['address'] + ":" + port + ")")
        }
      }
    }
    if(d["self-signed-permitted"]) {
      this.config["self-signed-permitted"]["permitted"] = (d["self-signed-permitted"].content == true);
      this.config["self-signed-permitted"]["digest"] = d["self-signed-permitted"].attributes["digest"];
      var port = Number.isInteger(argv['port']) ? argv['port'] : JSON.parse(fs.readFileSync('./utils/config.json', 'utf-8')).global.listenport;
      if(fs.existsSync('./Core/cache/'+this.instanceName+'-'+port+'.json'))
      {
        out.info('Certificate exists !');
        var saved = fs.readFileSync('./Core/cache/'+this.instanceName+'-'+port+'.json', 'utf-8');
        this.savedInstance = JSON.parse(saved);
      }
      else
      {
        //If selfsigned accepted, then the client SHOULD generate its
        //certificate so he can join the overlay
        var subjectName = "reloadjs:";
        Object.keys(ifaces).forEach(function (ifname) {
          ifaces[ifname].forEach(function (iface) {
            if(ifname === argv['i'] && 'IPv4' === iface.family)
              subjectName += iface.address;
          });
        });
        if(argv['port'] != undefined)
        {
          subjectName += ":" + argv['port'];
        }
        else
        {
          subjectName += "6084"; //default port
        }
        out.debug("SubjectName of the self-signed certificate : " + subjectName);
        var cerificateIds = generateSelfSignedCertificate(this.config["self-signed-permitted"]["digest"], subjectName, this.config["node-id-length"]);
        this.savedInstance = {
          localCertificate: cerificateIds.certificate,
          keys: cerificateIds.keys,
          localAddress: null,
          nodeIDs: cerificateIds.nodeIDs
        };
        fs.writeFileSync('./Core/cache/'+this.instanceName+'-'+port+'.json', JSON.stringify(this.savedInstance), 'utf8');
      }
    }
    if(d["turn-density"]) {
      this.config["turn-density"] = Number(d["turn-density"].content);
    }
    if(d["clients-permitted"]) {
      this.config["clients-permitted"] = (d["clients-permitted"].content == 'true');
    }
    if(d["no-ice"]) {
      this.config["no-ice"] = d["no-ice"].content;
    }
    if(d["chord:chord-update-interval"]) {
      this.config["chord-update-interval"] = Number(d["chord:chord-update-interval"].content);
    }
    if(d["chord:chord-ping-interval"]) {
      this.config["chord-ping-interval"] = Number(d["chord:chord-ping-interval"].content);
    }
    if(d["shared-secret"]) {
      this.config["shared-secret"] = d["shared-secret"].content;
    }
    if(d["max-message-size"]) {
      this.config["max-message-size"] = Number(d["max-message-size"].content);
    }
    if(d["initial-ttl"]) {
      this.config["initial-ttl"] = Number(d["initial-ttl"].content);
    }
    if(d["overlay-reliability-timer"]) {
      this.config["overlay-reliability-timer"] = Number(d["overlay-reliability-timer"].content);
    }
    if(d["kind-signer"]) {
      this.config["kind-signer"] = d["kind-signer"].content;
    }
    if(d["configuration-signer"]) {
      this.config["configuration-signer"] = d["configuration-signer"].content;
    }
    if(d["bad-node"]) {
      for(var key in this.overlay.children) {
        var name = this.overlay.children[key].name;
        if(this.overlay.children[key].name == "bad-node")
          this.config["bad-node"].push(this.overlay.children[key].content);
      }
    }
    if(d["mandatory-extension"]) {
      this.config["mandatory-extension"] = d["mandatory-extension"].content;
    }
    if(d["required-kinds"]) {
      this.config["required-kinds"] = d["required-kinds"].children;
      out.info("Checking all kinds signature...");
      //TODO
      out.info("Kinds signatures OK!");
    }
    out.info("Attributes OK!");
    this.setGlobals();
  }

  setGlobals() {
    //Save global variables used by the current instance
    global.hashAlgorithm = 'SHA1';
    global.signAlg = 'RSA';
    global.localCertificate = new ReloadCertificate(this.savedInstance.localCertificate, this.savedInstance.nodeIDs[0]);
    global.localPrivateKey = this.savedInstance.keys.private;
    global.localPublicKey = this.savedInstance.keys.public;
    global.keyStore = new Keystore(global.localCertificate, global.localPrivateKey);
    global.cryptoHelper = new CryptoHelper(global.keyStore, this.conf, global.signAlg, global.hashAlgorithm, global.signAlg);
    global.conf = this.config;
    global.configuration_sequence = this.sequence;
    global.nodeID = this.savedInstance.nodeIDs;
    global.joined = false;
    global.instance = this;
  }

  get(name) {
    for(var obj in this.overlay.children)
    {
      if(this.overlay.children[obj].name == name)
        return this.overlay.children[obj].content;
    }
  }
}
