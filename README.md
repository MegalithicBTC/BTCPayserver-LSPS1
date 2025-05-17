# LSPS1 BTCPay Server Plugin

The [LSPS1 (bLIP 51)](https://github.com/lightning/blips/blob/master/blip-0051.md) standard is a user-facing system for  nodes on the Lightning Network to get "inbound capacity", so that they can receive payments.  

This plugin is designed for maximum ease-of-use, such that new and existing BTCPay users could get an inbound channel to their attached or embedded Lightning node in just a few minutes.

In this application, we have two parties:

THE CLIENT: This is the user running BTCPay on some kind of computer, along with an attached Lightning node. 

THE LSP: This is the service provider who runs an automated service to respond to LSPS1 client requests, issue invoices, and open channels.

Please note that the LSPS1 standard calls 