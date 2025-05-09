using System;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BTCPayServer;                           // BTCPayNetwork / Provider
using BTCPayServer.Configuration;             // LightningNetworkOptions
using BTCPayServer.Data;                      // StoreData
using BTCPayServer.Lightning;                 // ILightningClient, NodeInfo, ConnectionResult
using BTCPayServer.Payments;                  // PaymentTypes
using BTCPayServer.Payments.Lightning;        // LightningPaymentMethodConfig
using BTCPayServer.Plugins.LSPS1.Models;
using BTCPayServer.Services;                  // LightningClientFactoryService
using BTCPayServer.Services.Invoices;         // PaymentMethodHandlerDictionary
using BTCPayServer.Services.Stores;           // StoreRepository
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NBitcoin;                               // PubKey

namespace BTCPayServer.Plugins.LSPS1.Services;

/// <summary>
/// Calls the external LSPS-1 endpoint and, when needed, asks the store's Lightning
/// client to connect to the LSP node.
/// </summary>
public sealed class LSPS1Service
{
    private const string InfoUrl = "https://megalithic.me/api/lsps1/v1/get_info";

    private readonly HttpClient                    _http;
    private readonly StoreRepository               _stores;
    private readonly LightningClientFactoryService _clientFactory;
    private readonly BTCPayNetwork                 _btc;
    private readonly LightningNetworkOptions       _lnOpts;
    private readonly ILogger<LSPS1Service>         _log;
    private readonly PaymentMethodHandlerDictionary _handlers;

    public LSPS1Service(
        HttpClient                         http,
        StoreRepository                    stores,
        LightningClientFactoryService      clientFactory,
        BTCPayNetworkProvider              nets,
        IOptions<LightningNetworkOptions>  lnOpts,
        ILogger<LSPS1Service>              log,
        PaymentMethodHandlerDictionary     handlers)
    {
        _http          = http;
        _stores        = stores;
        _clientFactory = clientFactory;
        _btc           = nets.BTC;
        _lnOpts        = lnOpts.Value;
        _log           = log;
        _handlers      = handlers;
    }

    /// <summary>Return the store's Lightning client (or <c>null</c>).</summary>
    private async Task<ILightningClient?> GetClientAsync(string storeId)
    {
        StoreData? store = await _stores.FindStore(storeId);
        if (store is null)
            return null;
        
        // Get the payment method ID for Lightning Network
        var id = PaymentTypes.LN.GetPaymentMethodId(_btc.CryptoCode);
        
        // Get the Lightning payment configuration
        var config = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(id, _handlers);
        
        if (config?.GetExternalLightningUrl() is { } connectionString)
        {
            return _clientFactory.Create(connectionString, _btc);
        }
        
        // If using internal node
        if (config?.IsInternalNode == true && 
            _lnOpts.InternalLightningByCryptoCode.TryGetValue(_btc.CryptoCode, out var internalLightningNode))
        {
            return internalLightningNode;
        }
        
        return null;
    }

    public async Task<(bool ok, string msg)> CheckAndConnectAsync(
        string storeId,
        CancellationToken ct = default)
    {
        try
        {
            // Step 1 – fetch /get_info from the LSP
            var response = await _http.GetStringAsync(InfoUrl, ct);
            var lspsInfo = JsonSerializer.Deserialize<LSPS1GetInfoResponse>(response);
            var uri = lspsInfo?.Uris?.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(uri))
                return (false, "LSPS-1 server did not return a node URI.");

            // Step 2 – obtain the Lightning client for this store
            var client = await GetClientAsync(storeId);
            if (client is null)
                return (false, "Store has no Lightning client configured.");

            var lspKey = new PubKey(uri.Split('@')[0]); 

            // Check if already connected by getting node info
            var info = await client.GetInfo(ct);
            // Use NodeId instead of PublicKey
            if (info != null && info.NodeInfoList?.Any(n => n.NodeId == lspKey) == true)
                return (true, "Already connected to the LSP.");

            // Step 3 – parse and connect
            if (!NodeInfo.TryParse(uri, out var nodeInfo))
                return (false, "Malformed node URI returned by the LSP.");

            var result = await client.ConnectTo(nodeInfo, ct);
            return result switch
            {
                ConnectionResult.Ok              => (true,  "Successfully connected to the LSP."),
                ConnectionResult.CouldNotConnect => (false, "Could not connect to the LSP."),
                _                                => (false, $"Unexpected result: {result}")
            };
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error checking or connecting to LSP for store {StoreId}", storeId);
            return (false, $"Error: {ex.Message}");
        }
    }
}