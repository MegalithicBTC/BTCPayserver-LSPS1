# LSPS1 BTCPay Server Plugin

The [LSPS1 (bLIP 51)](https://github.com/lightning/blips/blob/master/blip-0051.md) standard is a user-facing system for  nodes on the Lightning Network to get "inbound capacity", so that they can receive payments.  

This plugin is designed to implement the client-side of LSPS1, optimizing maximum ease-of-use, such that new and existing BTCPay users could get an inbound channel to their attached or embedded Lightning node in just a few seconds.

In this application, we have two parties:

THE CLIENT: This is the BTCPay user, running BTCPay on a local computer or VPS, along with an attached Lightning node. 

THE LSP: This is the service provider who runs an automated service to respond to LSPS1 client requests, issue invoices, and open channels. This plugin allows for THE CLIENT to select among several LSPs.

### Deviation from LSPS1 Standard
 
LSPS1 calls fo communication between THE CLIENT and THE LSP to be [carried over Lightning's BOLT8 transport layer](https://github.com/lightning/blips/blob/b48e5db6864d1de6e4b6d71a73ad75569cbff20c/blip-0051.md?plain=1#L14).

BOLT8 is more private than HTTPs, and has other advantages, however, the practical difficulties of a BTCPay Server plugin attempting to communicate **through** an attached Lightning node to an external service are daunting:  As we will see in this documentation, BTCPay Server's ability to query or manipulate its attached Lightning node are (currently) somewhat rudimentary.

Furthermore: BTCPay Server can be used with many **different** kinds of Lightning node, many of which don't yet have support for ad-hoc BOLT 8 messaging.  For a plugin to attempt to communicate with an LSP like 
`Client --> BTCPay Server --> Lightning Node (of any kind) --> LSP`...

... this would be really, really complicated. 

So, for this application, almost all communication between the CLIENT and the THE LSP is carried over HTTPs.

Besides this one caveat, this plugin is designed to comply fully with LSPS1.[^2]

## Design principles

BTCPay Server is a complex application with several layers of APIs added at various points during in its lifetime.  It's also written in a language (C#) that only a small minority of developers have experience with. At the same time, security is extremely important. All this adds up to a requirement for plugin developers: Only use server-side (C#, dotnet) functionality in your plugin where absolutely necessary.
 
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

If THE CLIENT has NOT yet attached a Lightning node to his BTCPay server instance, or if we are unable to determine the `public key` of THE CLIENT's attached Lightning node, then THE CLIENT will instead see a message here directing him to the `/lightning/BTC` route, in order to set up a Lightning Node.

You will note on this screen that we ask THE CLIENT to click a button "Connect to Lightning Service Provider". This is for an important reason:  We don't want BTCPay server users who might just be randomly looking at menu options to actually connect to an LSP node: We want THE CLIENT to affirmatively click this button to show that they are really interested in going down this path.

This is because, although not addressed in the LSPS1 spec, there are potential denial-of-service issues with many thousands of nodes at once attempting to connect to the same LSP node. So it's better, in order to improve the reliability of LSPs, that clients don't just open new connections "for no reason."

On this screen, THE CLIENT can also choose which LSP he wants to acquire a channel from. 

### Choose a Channel Size

When THE CLIENT clicks "Connect to Lightning Service Provider", this triggers an HTTP fetch operation to the LSP's `get_info` endpoint. (Take a look at the logs in your browser console to see what is going back-and-forth to this endpoint.) Assuming THE LSP replies with a JSON object that is compliant with LSPS1, THE CLIENT then sees:

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/choose-a-channel-size.png" alt="Choose A Channel Size" width="500" />

This screen is simple, but it embeds quite a few important assumptions that we should explain.

You will note that we tell THE CLIENT:

>We recommend that you open channels of at least 1,000,000 satoshis in size

A widely-held learned experience on the Lightning network is that opening channels that are "too small" results in disappointment. Small channels can only route limited payments until they are depleted, but the biggest problem is that small channels can, during times of high fees, become uneconomical to close. Not only that: But when dealing with interactions between different Lightning implementations (for example, a channel between a CLN node and an LND node), it's possible to get in a situation where one side of the channel will "refuse to close" a channel because doing so would be uneconomical.

For this reason, we:

1. Suggest (and provided a default at) a channel size of 1,000,000 satoshi.
2. Fully prevent THE CLIENT from requesting a channel size of below 150,000 satoshis, even if THE LSP in its `get_info` response allows channel sizes smaller than this. (Most don't do this, but some do.)

If you use the slider, you will see that it doesn't go below `150,000` satoshis, and its upward bound matches the largest channel size that THE LSP supports (as communicated in the `get info` response.)

You will also note on this screen that, although such an option is available in the LSPS1 specification, we DO NOT provide the option for THE CLIENT to request a zero-confirmation channel. This is because all of the node implementations (LND, CLN, LDK-NODE, etc.) require that THE CLIENT proactively "allow" such channels, and that can be tricky.[^1]

#### Advanced Options

By default, THE CLIENT will request a PUBLIC channel from the LSP. By clicking `Advanced Options`, THE CLIENT can toggle between a PUBLIC and PRIVATE channel. If THE CLIENT selects a PRIVATE channel, we warn him that he will need to enable "hop hints" when creating invoices with BTCPay.

#### Node public key

Some BTCPay users may be unsure of how to get their node's public key, so we provide it in the interface. 

#### Get Price button

A common question about LSPS1 implementations is "Why can't I see all the prices from all the LSPs at the same time?" And, you see here that we require THE CLIENT to pick a channel size BEFORE THE LSP provides a price quote. The short answer is that generating an invoice is a somewhat "expensive" operation for LSPs, and the LSPS1 spec requires that all "price quotes" are [accompanied by fully valid invoices](https://github.com/lightning/blips/blob/master/blip-0051.md#2-lsps1create_order). Indeed, well-run LSPs will actually have rate-limiting in place to prevent a user from requesting too many invoices, too fast. 


### Pay invoice to trigger channel opening

After clicking "Get Price", THE CLIENT sees this screen:

<img src="BTCPayServer.Plugins.LSPS1/Resources/docs/img/pay-invoice-to-get-channel.png" alt="Pay Invoice To Get Channel" width="500" />

Here the THE CLIENT can pay the invoice with any Lightning wallet. THE CLIENT's browser then begins to poll the [get order](https://github.com/lightning/blips/blob/master/blip-0051.md#21-lsps1get_order) endpoint. 

Note that LSPS1 is designed using [hold invoices](https://bitcoinops.org/en/topics/hold-invoices/). A very nice quality of this flow is that THE LSP can ensure that it is able to open a channel to THE CLIENT, and only "settle" the invoice immediately AFTER it confirms that it can successfully open the channel. For this reason, LSPs should NEVER need to "refund" THE CLIENT if the channel fails to open successfully.

### Success or Failure

THE CLIENT is polling THE LSP's [get order](https://github.com/lightning/blips/blob/master/blip-0051.md#21-lsps1get_order)  endpoint, and displays an appropriate failure or success message when the `get_order` endpoint produces a relevant result. 


## Testing this plugin  
Typically, it seems that entites who are developing BTCPay server plugins are encouraged to use a Docker setup, with all the major ancillary services (NBXplorer, Bitcoind, Lightning Node) [running in regtest](https://docs.btcpayserver.org/Development/LocalDev/#dependencies).

This is a great idea, but, after some confusion about the issue, we decided that there would be no practical way to use or test this plugin on regtest: The plugin is wholly reliant on external services provided by THE LSP, accessible over HTTPS.  Theoretically you could replicate THE LSP locally, but then you would have to run your own server-side LSP service, and that would be very complicated. 

Therefore, unless anyone else has a bright idea, our best suggestion is to use a test this plugin with a Docker Compose file that looks [something like this](https://github.com/MegalithicBTC/btcpayserver-docker/blob/master/docker-compose-ubuntu-caddy.yml) -- this shows the major services all running on Mainnet. 

It would also be possible to modify the plugin to allow THE CLIENT to choose between MutinyNet/Signet and Mainnet, as several of the LSPs have duplicate instances running on [MutinyNet/Signet](https://docs.megalithic.me/lightning-services/lsp1-get-inbound-liquidity-for-mobile-clients#step-1-client-requests-info-about-the-lsp-service).




## Issues for future investigation

### Client-side channel data

The LSPS1 specification does not require that the THE CLIENT have any particular access to data about its own node: The entire LSPS1 flow can be accomplished without THE CLIENT looking at its own internal state or list of channels.

It would however be useful for THE CLIENT to have access to this data, because then, BTCPay server could show useful alerts like:

> ⚠️ **No Inbound Capacity**  
> You have a Lightning Node, but no channel with inbound capacity. Please get a channel from an LSP so you can receive Lightning payments.

...and..

> ⚠️ **Channels Depleted**  
> Your Lightning Channels are depleted and you can no longer receive payments. Please swap funds out of your channel(s) or get a new channel from an LSP.

This is behavior we wanted to include with this plugin, and indeed, we saw some [sample work by LQWD](https://github.com/lightningriders/BTCPayServerPluginsProd/blob/3517fa40ce48767bb6c285273be9fef66090c8fb/Plugins/BTCPayServer.Plugins.Lqwd/Services/LqwdPluginService.cs#L335) which led to to initially believe that we WOULD be able to get such data through BTCPay server's API. 

Further investigation however has let us to believe that there is currently [no reliable way](https://github.com/Kukks/BTCPayServerPlugins/blob/6761a8f385aab596235975e46dd78e62724c74ea/Plugins/BTCPayServer.Plugins.MicroNode/MicroLightningClient.cs#L262) to get a list of channels from BTCPay server's API. 

Client-side channel data could also help users answer what will likely be a common question: "I paid the invoice to get the channel, I think I got the channel, but where can I see it?"

Currently THE CLIENT would have to open up a separate interface, for example "Ride The Lightning" in order to see the channel that was opened following the successful usage of this plugin.

### Client-side persistence

LSPS1 does NOT require that THE CLIENT perform any kind of long-term persistence of data in order to acquire a channel. It was therefore with some puzzlement that we reviewed [LQWD's plugin](https://github.com/lightningriders/BTCPayServerPluginsProd/tree/3517fa40ce48767bb6c285273be9fef66090c8fb/Plugins/BTCPayServer.Plugins.Lqwd/Migrations), which includes extensive database migrations.

In general, we think it's better to not attempt to persist state to BTCPay Server's database. But a counter-argument could be made: It might be useful for THE CLIENT to be able to see a "list of channels acquired from LSPs", with historical data like the size of the channel. 

That said, this seems lower priority than [Client-side channel data](#client-side-channel-data), which would serve a similar purpose but also most critically provide the actual **balances** available in existing channels.

### Footnotes

[^1]: Accepting zero-confirmation channels has security implications for the RECEIVER of the channel.  For this reason, all of the node implementations require special settings to allow inbound zero-confirmation channels.

For example with LND: an LND node must a special configuration value set to receive zero-conf channels, and it must additionally have a subscription CONSTANTLY RUNNING called a [channel acceptor](https://lightning.engineering/api-docs/api/lnd/lightning/channel-acceptor/), which basically intercepts inbound channel requests and returns "yes" or "no" if the inbound channel requests should be "allowed" to be zero-conf. This script has the unpleasant property that, if the backing LND node has a hiccup of some kind, the subscription will just quietly die without much notice ... and an LND node in "channel acceptor" mode will actually refuse ALL inbound channel requests if it sees that an "acceptor" subscription is NOT running. This can be not-so-fun.


For CLN, users have the opportunity [to do battle](https://github.com/voltagecloud/zero-conf-cln) with various third-party plugins which might (or might not) allow them to successful open a zero-confirmation channel.

[^2]: OK, not completely, actually. For one thing: We totally don't allow THE CLIENT to pay for his channel with an on-chain payment. If you care, ask us and we can explain why.




