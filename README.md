# LSPS1 BTCPay Server Plugin

The [LSPS1 (bLIP 51)](https://github.com/lightning/blips/blob/master/blip-0051.md) standard is a user-facing system for  nodes on the Lightning Network to get "inbound capacity", so that they can receive payments.  

This plugin is designed for maximum ease-of-use, such that new and existing BTCPay users could get an inbound channel to their attached or embedded Lightning node in just a few minutes.

In this application, we have two parties:

THE CLIENT: This is the user running BTCPay on some kind of computer, along with an attached Lightning node. 

THE LSP: This is the service provider who runs an automated service to respond to LSPS1 client requests, issue invoices, and open channels.
 
Please note that the LSPS1 standard calls for the communication between THE CLIENT and THE LSP to be [carried over Lightning's Bolt 8 transport layer](https://github.com/lightning/blips/blob/b48e5db6864d1de6e4b6d71a73ad75569cbff20c/blip-0051.md?plain=1#L14).

BOLT8 is more private than HTTPS, and has other advantages, however, the practical difficulties of a BTCPay Server plugin attempting to communicate **through** an attached Lightning node to an external service are daunting:  As we will see in this documentation, BTCPay server's ability to communicate and manipulate its attached Lightning node are (currently) rudimentary at best, and furthermore, BTCPay server can be used with many different kinds of Lightning nodes, many of which don't yet have support for ad-hoc BOLT 8 messaging.

So, for this application, almost all communication between the CLIENT and the THE LSP is carried over HTTPS.

Besides this caveat, this plugin is designed to comply fully with LSPS1.

## Design principles

BTCPay server is a complex application with several layers of APIs added at various points in its lifetime.

For this reason, we've tried to push as much of the complexity as possible of this plugin to the client side, in Javascript.

We rely on C# methods in BTCPay server for only two purposes:
1. Validate that THE CLIENT has a Lightning node attached to his/her BTCPay server instance, and get the `public_key` of this Lightning node.
2. Connect to the public URI of the node provided by THE LSP.

The code to perform these operations can be reviewed in [LSPS1Controller.cs](BTCPayServer.Plugins.LSPS1/Controllers/LSPS1Controller.cs)



