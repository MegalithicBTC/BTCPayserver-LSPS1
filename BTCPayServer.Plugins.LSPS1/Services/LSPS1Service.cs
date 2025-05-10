using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BTCPayServer;
using BTCPayServer.Configuration;
using BTCPayServer.Data;
using BTCPayServer.Lightning;
using BTCPayServer.Payments;
using BTCPayServer.Payments.Lightning;
using BTCPayServer.Plugins.LSPS1.Models;
using BTCPayServer.Services;
using BTCPayServer.Services.Invoices;
using BTCPayServer.Services.Stores;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NBitcoin;

namespace BTCPayServer.Plugins.LSPS1.Services;

public sealed class LSPS1Service
{
    private static readonly LspProvider[] _lspProviders = new[]
    {
        new LspProvider { Name = "Megalith LSP", Url = "https://megalithic.me/api/lsps1" },
        new LspProvider { Name = "Olympus LSP", Url = "https://lsps1.lnolymp.us/api" },
        new LspProvider { Name = "Flashsats LSP", Url = "https://lsp.flashsats.xyz/api" }
    };

    private readonly HttpClient _http;
    private readonly StoreRepository _stores;
    private readonly LightningClientFactoryService _clientFactory;
    private readonly BTCPayNetwork _btc;
    private readonly LightningNetworkOptions _lnOpts;
    private readonly ILogger<LSPS1Service> _log;
    private readonly PaymentMethodHandlerDictionary _handlers;

    public LSPS1Service(
        HttpClient http,
        StoreRepository stores,
        LightningClientFactoryService clientFactory,
        BTCPayNetworkProvider nets,
        IOptions<LightningNetworkOptions> lnOpts,
        ILogger<LSPS1Service> log,
        PaymentMethodHandlerDictionary handlers)
    {
        _http = http;
        _stores = stores;
        _clientFactory = clientFactory;
        _btc = nets.BTC;
        _lnOpts = lnOpts.Value;
        _log = log;
        _handlers = handlers;
    }

    public IEnumerable<LspProvider> GetAllLsps() => _lspProviders;

    public LspProvider? GetLspBySlug(string slug) => 
        _lspProviders.FirstOrDefault(p => p.Slug == slug.ToLowerInvariant());

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

    public async Task<(bool ok, string msg, LspProvider? provider)> TryConnectToLspAsync(
        string storeId, 
        string? lspSlug = null, 
        CancellationToken ct = default)
    {
        // If a specific LSP is requested, try it first
        if (!string.IsNullOrEmpty(lspSlug))
        {
            var specificLsp = GetLspBySlug(lspSlug);
            if (specificLsp != null)
            {
                var result = await ConnectToLspAsync(storeId, specificLsp, ct);
                if (result.ok)
                    return (result.ok, result.msg, specificLsp);
                
                // If the specific LSP failed, fall through to try others
                _log.LogWarning("Requested LSP {LspSlug} connection failed. Falling back to LSP list.", lspSlug);
            }
        }
        
        // Try each LSP in order until one succeeds
        foreach (var lsp in _lspProviders)
        {
            var result = await ConnectToLspAsync(storeId, lsp, ct);
            if (result.ok)
                return (result.ok, result.msg, lsp);
            
            _log.LogInformation("LSP {LspName} connection failed. Trying next LSP.", lsp.Name);
        }
        
        return (false, "Failed to connect to any Lightning Service Provider.", null);
    }

    private async Task<(bool ok, string msg)> ConnectToLspAsync(
        string storeId,
        LspProvider lsp,
        CancellationToken ct = default)
    {
        try
        {
            // Step 1 – fetch /get_info from the LSP
            var infoUrl = $"{lsp.Url.TrimEnd('/')}/v1/get_info";
            
            _log.LogInformation("Fetching LSPS1 info from {Url}", infoUrl);
            HttpResponseMessage response;
            
            try
            {
                response = await _http.GetAsync(infoUrl, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _log.LogWarning("LSP returned status code {StatusCode}", response.StatusCode);
                    return (false, $"LSP returned status code {response.StatusCode}");
                }
            }
            catch (HttpRequestException ex)
            {
                _log.LogWarning(ex, "Failed to connect to LSP at {Url}", infoUrl);
                return (false, $"Failed to connect to LSP: {ex.Message}");
            }
            
            var responseContent = await response.Content.ReadAsStringAsync(ct);
            LSPS1GetInfoResponse? lspsInfo;
            
            try
            {
                lspsInfo = JsonSerializer.Deserialize<LSPS1GetInfoResponse>(responseContent);
                if (lspsInfo == null)
                {
                    return (false, "LSP returned invalid JSON response");
                }
            }
            catch (JsonException ex)
            {
                _log.LogWarning(ex, "Failed to parse LSP info response");
                return (false, "LSP returned invalid JSON format");
            }
            
            var uri = lspsInfo.Uris?.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(uri))
                return (false, "LSP did not return a node URI");

            // Step 2 – obtain the Lightning client for this store
            var client = await GetClientAsync(storeId);
            if (client is null)
                return (false, "Store has no Lightning client configured");

            var lspKey = new PubKey(uri.Split('@')[0]); 

            // Check if already connected by getting node info
            var info = await client.GetInfo(ct);
            if (info != null && info.NodeInfoList?.Any(n => n.NodeId == lspKey) == true)
                return (true, $"Already connected to {lsp.Name}");

            // Step 3 – parse and connect
            if (!NodeInfo.TryParse(uri, out var nodeInfo))
                return (false, "Malformed node URI returned by the LSP");

            var result = await client.ConnectTo(nodeInfo, ct);
            return result switch
            {
                ConnectionResult.Ok => (true, $"Successfully connected to {lsp.Name}"),
                ConnectionResult.CouldNotConnect => (false, $"Could not connect to {lsp.Name}"),
                _ => (false, $"Unexpected result: {result}")
            };
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Error checking or connecting to LSP {LspName} for store {StoreId}", lsp.Name, storeId);
            return (false, $"Error connecting to {lsp.Name}: {ex.Message}");
        }
    }
}