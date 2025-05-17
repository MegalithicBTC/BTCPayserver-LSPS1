# LSPS1 BTCPay Server Plugin

The [LSPS1 (bLIP 51)](https://github.com/lightning/blips/blob/master/blip-0051.md) standard is a user-facing system for  nodes on the Lightning Network to get "inbound capacity", so that they can receive payments.  

This plugin is designed for maximum ease-of-use, such that new and existing BTCPay users could get an inbound channel to their attached or embedded Lightning node in just a few minutes.

In this application, we have two parties:

THE CLIENT: This is the user running BTCPay on some kind of computer, along with an attached Lightning node. 

THE LSP: This is the service provider who runs an automated service to respond to LSPS1 client requests, issue invoices, and open channels.
 
Please note that the LSPS1 standard calls for the communication between THE CLIENT and THE LSP to be [carried over Lightning's Bolt 8 transport layer](https://github.com/lightning/blips/blob/b48e5db6864d1de6e4b6d71a73ad75569cbff20c/blip-0051.md?plain=1#L14).

BOLT8 is more private than HTTPS, and has other advantages, however, the practical difficulties of a BTCPay Server plugin attempting to communicate **through** an attached Lightning node to an external service are daunting:  As we will see in this documentation, BTCPay Server's ability to communicate and manipulate its attached Lightning node are (currently) rudimentary at best, and furthermore, BTCPay Server can be used with many different kinds of Lightning nodes, many of which don't yet have support for ad-hoc BOLT 8 messaging.

So, for this application, almost all communication between the CLIENT and the THE LSP is carried over HTTPS.

Besides this caveat, this plugin is designed to comply fully with LSPS1.

## Design principles

BTCPay Server is a complex application with several layers of APIs added at various points in its lifetime.  At the same time, security is extremely important, so it's critical that plugins only use Server-side functionality when absolutely necessary.
 
For this reason, we've tried to push as much of the complexity as possible of this plugin to the client side, in Javascript.

We rely on C# methods in BTCPay Server for only two purposes:
1. Validate that THE CLIENT has a Lightning node attached to his/her BTCPay Server instance, and get the `public_key` of this Lightning node.
2. Connect to the public URI of the node provided by THE LSP.

The code to perform these operations can be reviewed in [LSPS1Controller.cs](BTCPayServer.Plugins.LSPS1/Controllers/LSPS1Controller.cs) and [LightningNodeService.cs](BTCPayServer.Plugins.LSPS1/Services/LightningNodeService.cs).

## User flow

With the plugin installed, a "Get Lightning Channel" link is displayed in the list of plugins.

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/get-lightning-channel-menu-button.png" alt="Get Lightning Channel Menu Button" width="250" />

At this point THE CLIENT gets to the first page of the plugin. If THE CLIENT has already attached a Lightning node to his BTCPay Server instance, he will see this screen:

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/connect-to-provider.png" alt="Get Lightning Channel Menu Button" width="600" />

If THE CLIENT has NOT yet attached a Lightning node to his BTCPay server instance, or if we are unable to determine the `public key` of the user's attached Lightning node, then the user will instead see a message here directing him to the `/lightning/BTC` route, in order to set up a Lightning Node.

You will note on this screen that we ask the user to click a button "Connect to Lightning Service Provider". This is for an important reason:  We don't want BTCPay server users who might just be randomly looking at menu options to actually connect to an LSP node: We want the user to affirmatively click this button to show that they are really interested in going down this path.

This is because, although not addressed in the LSPS1 spec, there are potential denial-of-service issues with many thousands of nodes at once attempting to connect to the same LSP node. So it's better, in order to improve the reliability of LSPs, that clients don't just open new connections "for no reason."

On this screen, the user can also choose which LSP he wants to acquire a channel from. 

When the user clicks "Connect to Lightning Service Provider", this triggers an HTTP fetch operation to the LSP's `get_info` endpoint. (Take a look at the console logs in your browser to see this in action.) Assuming the LSP replies with a JSON object that is compliant with LSPS1, the user then sees:
