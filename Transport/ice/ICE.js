'use strict';
/**
* This class uses WebRTC for gathering STUN/TURN candidates.
* It also uses WebRTC signalling for connecting another peer, because
* there is currently no full ICE implementation in js except in WebRTC.
*/
const RTCPeerConnection = require('wrtc').RTCPeerConnection;
const RTCSessionDescription = require('wrtc').RTCSessionDescription;
var transform = require('sdp-transform');

module.exports.ICE = class ICE {
  constructor() {
  }
  static getSDPOffer(c) {
    var pc;
    var ice =  [
      {
        urls: ['stun:stun.l.google.com:19302']
      }
    ];
    for(var ip of global.turns) {
      ice.push({
        urls: ["turn:"+ip+":3478"],
        username: "username",
        credential: "password"
      });
    }
    pc = new RTCPeerConnection({
      iceServers: ice
    }, {
      optional: [{
        RtpDataChannels: false
      }]
    });
    var gotReflective = true;
    pc.onicecandidate = function(candidate) {
      if (candidate.candidate) {
        pc.addIceCandidate(candidate);
        if (candidate.candidate.candidate.indexOf('typ srflx') > -1) {
          gotReflective = true;
        }
      }
    };
    pc.onicegatheringstatechange = function() {
      if (pc.iceGatheringState === 'complete') {
        c(pc);
        //DEBUG ONLY :
        var obj = transform.parse(pc.localDescription.sdp);
        var ips = new Set();
        ips.add(obj.origin.address);
        for(var addr of obj.media[0].candidates)
        {
          if(addr.type !== 'relay')
          ips.add(addr.ip);
        }
        global.ips = Array.from(ips);
        //END OF DEBUG
      }
    };
    var channel = pc.createDataChannel('reload');
    channel.onopen = function(event) {
      global.connectionManager.ICEonConnect(channel);
    }
    channel.onmessage = function(event) {
      global.connectionManager.ICEonMessage(channel, event.data, pc);
    }
    channel.onclose = function(event) {
      console.log(event);
      global.connectionManager.ICEonClose(channel);
    }
    pc.createOffer().then(function(e) {
      pc.setLocalDescription(new RTCSessionDescription(e));
    });
  }
  static getSDPAnswer(offerDist, callback) {
    var ice =  [
      {
        urls: ['stun:stun.l.google.com:19302']
      }
    ];
    for(var ip of global.turns) {
      ice.push({
        urls: ["turn:"+ip+":3478"],
        username: "username",
        credential: "password"
      });
    }
    let rtc = new RTCPeerConnection({
      iceServers: ice
    }, {
      optional: [{
        RtpDataChannels: false
      }]
    });

    let c = callback;
    var offer = {
      type: 'offer',
      sdp: offerDist
    };
    rtc.setRemoteDescription(offer).then(function() {
      rtc.createAnswer().then(function(answerDesc) {
        rtc.setLocalDescription(answerDesc).then(function() {
          let a = answerDesc;
          rtc.onicecandidate = function(candidate) {
            if (candidate.candidate) {
              rtc.addIceCandidate(candidate);
            }
          };
          rtc.onicegatheringstatechange = function() {
            if (rtc.iceGatheringState === 'complete') {
              c(rtc);
            }
          };
          rtc.ondatachannel = function(ev) {
            var channel = ev.channel;
            channel.onopen = function(event) {
              global.connectionManager.ICEonConnect(channel);
            }
            channel.onmessage = function(event) {
              global.connectionManager.ICEonMessage(channel, event.data, rtc);
            }
            channel.onclose = function(event) {
              console.log(event);
              global.connectionManager.ICEonClose(channel);
            }
          };
        });
      });
    });
  }
  static connect(rtc, sdpDist) {
    rtc.setLocalDescription(rtc.localDescription).then(function() {
      rtc.setRemoteDescription(sdpDist).then(function() {
      });
    });
  }
};
