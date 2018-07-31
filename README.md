# RELOAD.js

RELOAD.js is a demo implementation of **[RFC 6940](https://tools.ietf.org/html/rfc6940)**. It mainly implements signalling technologies (Attach, ICE, Bootstrapping, Discovering, CHORD).

[![MPLv2 License](https://img.shields.io/badge/licence-BSD-green.svg)](https://github.com/Seragonia/reloadjs/blob/master/LICENSE)   ![MPLv2 License](https://img.shields.io/badge/npm-%3E%3D5.6.0-yellowgreen.svg)   ![MPLv2 License](https://img.shields.io/badge/node-%3E%3D8.11.3-blue.svg)

## Goals

The objective is to implement the technology in NodeJS in order to facilitate tests on the resilience of the solution. Eventually, the missing parts will be implemented.

## Getting Started

Take a look at the [Getting Started guide](https://github.com/Seragonia/reloadjs/wiki/Getting-Started). 
By default, this implementation runs locally on a single machine. For more information, read the Getting Started Guide.

**Quick start**

The quickest way to get started with RELOAD.js is to run the following commands :
```bash
> npm i
> # Use this line to launch the first instance of RELOAD.js.
> # You will need to run this command on a machine with an IP
> # Accessible by all future peers.
> # Change [interface-name] as your want.
> node reload.js -i [interface-name] --first
```
_E.g.: node reload.js -i "'Wi-Fi" --first_
```bash
> # Then launch a peer instance :
> # Use --port option to use a different port number
> # Use -e option to clear the previously registered information for this port
> # Use --overlay-name option to directly choose an overlay name in the case where the configuration file has several of them
> npm reload.js -i [interface-name] [--port number [--overlay-name name [-e 
```
If you want to change the configuration server URL or overlay name, take a look at the [Configuration guide](https://github.com/Seragonia/reloadjs/wiki/Configuration-Guide). 

## Features
* **Bootstrapping**. Retrieving a configuration file from an HTTPS server or using a local file.
* **X.509 autosigned certificate generation**. Each peer can generate dynamically its own certificate (PKI not supported yet). Use the _-e_ option to regenerate it.
* **XML RELOAD configuration file checking**. Checks the validity of the configuration file, and uses default values from the RFC if needed.
* **Asynchronous**. RELOAD.js takes advantage of Nodejs asynchronous operation to implement this RFC.
* **Full ICE**. This implementation uses ICE from WebRTC to do NAT Traversal. A peer of the RELOAD network can also announce itself as a TURN server.
* **CHORD Routing Table**. CHORD is implemented in RELOADjs and allows the implementation of an overlay using this DHT.
* **Demo mode**. Each peer displays a web page to check its status at the port where it is launched +10000. For example, an instance running on port 5000 will display a demo page on port 15000.

## Docs & Community

* Visit the [Wiki](https://github.com/Seragonia/reloadjs/wiki)
* Read the [RFC 6940](https://tools.ietf.org/html/rfc6940).

## Security Notes

The current implementation works for demonstration purposes and uses self-signed certificates. It is not intended to be used for a project in release mode!


# Tests

Comming soon.

# Licence 
[BSDv2](https://github.com/Seragonia/reloadjs/blob/master/LICENSE)
