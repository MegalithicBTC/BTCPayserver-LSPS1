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


### Using the plugin

With the plugin installed, a "Get Lightning Channel" link is displayed in the list of plugins.

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/get-lightning-channel-menu-button.png" alt="Get Lightning Channel Menu Button" width="250" />

### Connect to LSP
At this point THE CLIENT gets to the first page of the plugin. If THE CLIENT has already attached a Lightning node to his BTCPay Server instance, he will see this screen:

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/connect-to-provider.png" alt="Connect To Provider" width="500" />

If THE CLIENT has NOT yet attached a Lightning node to his BTCPay server instance, or if we are unable to determine the `public key` of the user's attached Lightning node, then the user will instead see a message here directing him to the `/lightning/BTC` route, in order to set up a Lightning Node.

You will note on this screen that we ask the user to click a button "Connect to Lightning Service Provider". This is for an important reason:  We don't want BTCPay server users who might just be randomly looking at menu options to actually connect to an LSP node: We want the user to affirmatively click this button to show that they are really interested in going down this path.

This is because, although not addressed in the LSPS1 spec, there are potential denial-of-service issues with many thousands of nodes at once attempting to connect to the same LSP node. So it's better, in order to improve the reliability of LSPs, that clients don't just open new connections "for no reason."

On this screen, the user can also choose which LSP he wants to acquire a channel from. 

### Choose a Channel Size

When the user clicks "Connect to Lightning Service Provider", this triggers an HTTP fetch operation to the LSP's `get_info` endpoint. (Take a look at the logs in your browser console to see what is going back-and-forth to this endpoint.) Assuming the LSP replies with a JSON object that is compliant with LSPS1, the user then sees:

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/choose-a-channel-size.png" alt="Choose A Channel Size" width="500" />

This screen is simple, but it embeds quite a few important assumptions that we should explain.

You will note that we tell the user:

>We recommend that you open channels of at least 1,000,000 satoshis in size

A widely-held learned experience on the Lightning network is that opening channels that are "too small" results in disappointment. Small channels can only route limited payments until they are depleted, but the biggest problem is that small channels can, during times of high fees, become uneconomical to close. Not only that: But when dealing with interactions between different Lightning implementations (for example, a channel between a CLN node and an LND node), it's possible to get in a situation where one side of the channel will "refuse to close" a channel because doing so would be uneconomical.

For this reason, we:

1. Suggest (and provided a default at) a channel size of 1,000,000 satoshi.
2. Fully prevent THE CLIENT from requesting a channel size of below 150,000 satoshis, even if the LSP in its `get_info` response allows channel sizes smaller than this. (Most don't do this, but some do.)

If you use the slider, you will see that it doesn't go below `150,000` satoshis, and its upward bound matches the largest channel size that THE LSP supports (as communicated in the `get info` response.)

You will also note on this screen that, although such an option is available in the LSPS1 specification, we DO NOT provide the option for THE CLIENT to request a zero-confirmation channel. This is because all of the node implementations (LND, CLN, LDK-NODE, etc.) require that the user proactively "allow" such channels, and that can be tricky. 

#### Advanced Options

By default, THE CLIENT will request a PUBLIC channel from the LSP. By clicking `Advanced Options`, the user can toggle between a PUBLIC and PRIVATE channel. If the user selects a PRIVATE channel, we warn him that he will need to enable "hop hints" when creating invoices with BTCPay.

#### Node public key

Some BTCPay users may be unsure of how to get their node's public key, so we provide it in the interface. 

#### Get Price button

A common question about LSPS1 implementations is "Why can't I see all the prices from all the LSPs at the same time?" And, you see here that we require the user to pick a channel size BEFORE the LSP provides a price quote. The short answer is that generating an invoice is a somewhat "expensive" operation for LSPs, and the LSPS1 spec requires that all "price quotes" are [accompanied by fully valid invoices](https://github.com/lightning/blips/blob/master/blip-0051.md#2-lsps1create_order). Indeed, well-run LSPs will actually have rate-limiting in place to prevent a user from requesting too many invoices, too fast. 


### Pay invoice to trigger channel opening

After clicking "Get Price", the user sees this screen:

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/pay-invoice-to-get-channel.png" alt="Choose A Channel Size" width="500" />

Here the THE CLIENT can pay the invoice with any Lightning wallet. THE CLIENT's browser then begins to poll the [get order](https://github.com/lightning/blips/blob/master/blip-0051.md#21-lsps1get_order) endpoint. 

Note that LSPS1 is designed using [hold invoices](https://bitcoinops.org/en/topics/hold-invoices/). A very nice quality of this flow is that THE LSP can ensure that it is able to open a channel to THE CLIENT, and only "settle" the invoice immediately AFTER it confirms that it can successfully open the channel. For this reason, LSPs should NEVER need to "refund" THE CLIENT if the channel fails to open successfully.

### Success or Failure

THE CLIENT is polling THE LSP's [get order](https://github.com/lightning/blips/blob/master/blip-0051.md#21-lsps1get_order)  endpoint, and displays an appropriate failure or success message when the `get_order` endpoint produces a relevant result. 









