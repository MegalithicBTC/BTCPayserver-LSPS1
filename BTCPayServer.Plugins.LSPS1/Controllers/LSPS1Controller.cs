using BTCPayServer.Abstractions.Constants;
using BTCPayServer.Client;
using BTCPayServer.Configuration;
using BTCPayServer.Data;
using BTCPayServer.Lightning;
using BTCPayServer.Plugins.LSPS1.Models;
using BTCPayServer.Plugins.LSPS1.Services;
using BTCPayServer.Services;
using BTCPayServer.Services.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BTCPayServer.Payments;
using BTCPayServer.Payments.Lightning;
using BTCPayServer.Services.Invoices;

namespace BTCPayServer.Plugins.LSPS1.Controllers
{
    [Route("stores/{storeId}/plugins/lsps1")]
    [Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie)]
    public sealed class LSPS1Controller : Controller
    {
        private readonly LSPS1Service _svc;
        private readonly StoreRepository _storeRepository;
        private readonly BTCPayNetworkProvider _networkProvider;
        private readonly LightningClientFactoryService _lightningClientFactory;
        private readonly ILogger<LSPS1Controller> _logger;
        private readonly PaymentMethodHandlerDictionary _paymentMethodHandlerDictionary;

        public LSPS1Controller(
            LSPS1Service svc,
            StoreRepository storeRepository,
            BTCPayNetworkProvider networkProvider,
            LightningClientFactoryService lightningClientFactory,
            PaymentMethodHandlerDictionary paymentMethodHandlerDictionary,
            ILogger<LSPS1Controller> logger)
        {
            _svc = svc;
            _storeRepository = storeRepository;
            _networkProvider = networkProvider;
            _lightningClientFactory = lightningClientFactory;
            _paymentMethodHandlerDictionary = paymentMethodHandlerDictionary;
            _logger = logger;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(string storeId, [FromQuery] string? lsp = null)
        {
            // Get store for Lightning node information
            var store = await _storeRepository.FindStore(storeId);
            if (store == null)
                return NotFound();

            // First check if a valid Lightning node configuration exists
            string? nodePublicKey = await GetNodePublicKey(store);
            bool userHasLightningNode = !string.IsNullOrEmpty(nodePublicKey);
            
            // Initialize variables
            bool userNodeIsConnectedToLsp = false;
            bool userNodeFailedToConnectToLsp = false;
            LspProvider? connectedLsp = null;
            LSPS1GetInfoResponse? lspInfo = null;
            IEnumerable<Dictionary<string, object>> channels = Array.Empty<Dictionary<string, object>>();
            
            // Only try to connect to LSP if user has a Lightning node
            if (userHasLightningNode)
            {
                // Get the user's current channels
                var lightningChannels = await GetLightningChannels(store);
                channels = lightningChannels.Select(c => {
                    // Extract what we can safely
                    var response = new Dictionary<string, object>
                    {
                        ["remotePubKey"] = c.RemoteNode?.ToString() ?? "",
                        ["capacity"] = c.Capacity.MilliSatoshi,
                        ["localBalance"] = c.LocalBalance?.MilliSatoshi ?? 0,
                        ["active"] = c.IsActive,
                        ["isPublic"] = c.IsPublic
                    };
                    
                    // Try to add channel identifiers safely
                    try {
                        // Different implementations might use different property names
                        response["channelId"] = c.ToString() ?? "unknown";
                    }
                    catch {
                        response["channelId"] = "unknown";
                    }
                    
                    return response;
                }).ToList();
                
                // Try to connect to the LSP
                var result = await _svc.TryConnectToLspAsync(storeId, lsp);
                userNodeIsConnectedToLsp = result.success;
                userNodeFailedToConnectToLsp = !result.success;
                connectedLsp = result.selectedLsp;
                
                // Fetch LSP info if connected
                if (userNodeIsConnectedToLsp && connectedLsp != null)
                {
                    lspInfo = await _svc.GetLspInfoAsync(storeId, connectedLsp);
                }
            }
            
            var vm = new PluginPageViewModel
            {
                StoreId = storeId,
                AvailableLsps = _svc.GetAllLsps(),
                ConnectedLsp = connectedLsp,
                SelectedLspSlug = lsp ?? connectedLsp?.Slug ?? string.Empty,
                LspInfo = lspInfo,
                NodePublicKey = nodePublicKey ?? string.Empty,
                UserHasLightningNode = userHasLightningNode,
                UserNodeIsConnectedToLsp = userNodeIsConnectedToLsp,
                UserNodeFailedToConnectToLsp = userNodeFailedToConnectToLsp
            };
            
            // Create a client data object with all the properties needed by JavaScript
            var clientData = new
            {
                storeId = vm.StoreId,
                userNodeIsConnectedToLsp = vm.UserNodeIsConnectedToLsp,
                userNodeFailedToConnectToLsp = vm.UserNodeFailedToConnectToLsp,
                selectedLspSlug = vm.SelectedLspSlug,
                connectedLspName = vm.ConnectedLsp?.Name ?? string.Empty,
                lspInfoJson = vm.LspInfoJson,
                nodePublicKey = vm.NodePublicKey,
                userHasLightningNode = vm.UserHasLightningNode,
                userChannels = channels,
                availableLsps = vm.AvailableLsps.Select(lsp => new 
                {
                    slug = lsp.Slug,
                    name = lsp.Name,
                    selected = lsp.Slug == vm.SelectedLspSlug
                })
            };
            
            // Serialize the data for the client
            ViewBag.ClientDataJson = JsonSerializer.Serialize(clientData, new JsonSerializerOptions 
            { 
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
            
            return View(vm);
        }

        // Connect to other Lightning nodes
        private async Task<bool> ConnectToNode(StoreData store, string nodeUri, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Attempting to connect to Lightning node {NodeUri} for store {StoreId}", nodeUri, store.Id);
                
                // Get Lightning client for this store
                var lightningClient = GetLightningClient(store);
                if (lightningClient == null)
                {
                    _logger.LogWarning("Could not get Lightning client for store {StoreId}", store.Id);
                    return false;
                }
                
                // Convert string URI to NodeInfo
                if (!NodeInfo.TryParse(nodeUri, out var nodeInfo))
                {
                    _logger.LogWarning("Invalid node URI format: {Uri}", nodeUri);
                    return false;
                }
                
                // Connect to the node
                var result = await lightningClient.ConnectTo(nodeInfo, cancellationToken);
                bool success = result == ConnectionResult.Ok;
                
                if (success)
                    _logger.LogInformation("Successfully connected to Lightning node {NodeUri} for store {StoreId}", nodeUri, store.Id);
                else
                    _logger.LogWarning("Failed to connect to Lightning node {NodeUri} for store {StoreId}", nodeUri, store.Id);
                    
                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to Lightning node {NodeUri} for store {StoreId}: {Message}", 
                    nodeUri, store.Id, ex.Message);
                return false;
            }
        }
        
        // Get a list of currently open channels
        private async Task<IEnumerable<LightningChannel>> GetLightningChannels(StoreData store, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Retrieving Lightning channels for store {StoreId}", store.Id);
                
                // Get Lightning client for this store
                var lightningClient = GetLightningClient(store);
                if (lightningClient == null)
                {
                    _logger.LogWarning("Could not get Lightning client for store {StoreId}", store.Id);
                    return Array.Empty<LightningChannel>();
                }
                
                // Get the list of channels
                var channels = await lightningClient.ListChannels(cancellationToken);
                
                _logger.LogInformation("Retrieved {Count} Lightning channels for store {StoreId}", 
                    channels.Length, store.Id);
                
                return channels;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Lightning channels for store {StoreId}: {Message}", 
                    store.Id, ex.Message);
                return Array.Empty<LightningChannel>();
            }
        }
        
        // Get Lightning client for a store - helper method used by the other methods
        private ILightningClient? GetLightningClient(StoreData store)
        {
            try
            {
                // Following exactly how UIPublicLightningNodeInfoController does it
                var paymentMethodId = PaymentTypes.LN.GetPaymentMethodId("BTC");
                
                // Check if handler exists for the payment method
                if (_paymentMethodHandlerDictionary.TryGet(paymentMethodId) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogWarning("Lightning payment handler not found for store {StoreId}", store.Id);
                    return null;
                }
                
                // Get Lightning config from store
                var lightningConfig = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(
                    paymentMethodId, 
                    _paymentMethodHandlerDictionary);
                    
                if (lightningConfig == null)
                {
                    _logger.LogWarning("Store {StoreId} has no Lightning configuration", store.Id);
                    return null;
                }

                // Get the network for BTC
                var network = _networkProvider.GetNetwork<BTCPayNetwork>("BTC");
                
                // Create the Lightning client
                return lightningConfig.CreateLightningClient(network, 
                    Microsoft.Extensions.Options.Options.Create(
                        new LightningNetworkOptions()).Value, 
                    _lightningClientFactory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating Lightning client for store {StoreId}: {Message}", 
                    store.Id, ex.Message);
                return null;
            }
        }

        private async Task<string?> GetNodePublicKey(StoreData store)
        {
            try
            {
                // Get store ID for logging
                string storeId = store.Id;
                
                _logger.LogInformation("Attempting to retrieve Lightning node public key for store {StoreId}", storeId);
                
                // Following exactly how UIPublicLightningNodeInfoController does it
                var paymentMethodId = PaymentTypes.LN.GetPaymentMethodId("BTC");
                
                // Check if handler exists for the payment method
                if (_paymentMethodHandlerDictionary.TryGet(paymentMethodId) is not LightningLikePaymentHandler handler)
                {
                    _logger.LogWarning("Lightning payment handler not found for store {StoreId}", storeId);
                    return null;
                }
                
                // Get Lightning config from store
                var lightningConfig = store.GetPaymentMethodConfig<LightningPaymentMethodConfig>(
                    paymentMethodId, 
                    _paymentMethodHandlerDictionary);
                    
                if (lightningConfig == null)
                {
                    _logger.LogWarning("Store {StoreId} has no Lightning configuration", storeId);
                    return null;
                }
                
                _logger.LogInformation("Found Lightning configuration for store {StoreId}, retrieving node info", storeId);
                
                // Get node info directly using the handler
                var nodeInfoList = await handler.GetNodeInfo(lightningConfig, null);
                
                // Extract the public key from node URI (pubkey@host:port)
                if (nodeInfoList.Any())
                {
                    string nodeUri = nodeInfoList.First().ToString();
                    _logger.LogInformation("Found Lightning node URI: {NodeUri}", nodeUri);
                    
                    int atIndex = nodeUri.IndexOf('@');
                    
                    if (atIndex > 0)
                    {
                        string pubKey = nodeUri.Substring(0, atIndex);
                        _logger.LogInformation("Successfully extracted Lightning node public key: {PubKey}", pubKey);
                        return pubKey;
                    }
                }
                
                // If we couldn't extract the public key from the URI, try another approach
                if (nodeInfoList.Any())
                {
                    var nodeInfo = nodeInfoList.First();
                    // The NodeId property is a PubKey object, need to convert to string
                    if (nodeInfo.NodeId != null)
                    {
                        string pubKey = nodeInfo.NodeId.ToString();
                        _logger.LogInformation("Successfully retrieved Lightning node public key from NodeId: {PubKey}", pubKey);
                        return pubKey;
                    }
                }
                
                _logger.LogWarning("Could not extract public key from Lightning node for store {StoreId}", storeId);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Lightning node public key for store {StoreId}: {Message}", store.Id, ex.Message);
                return null;
            }
        }
        
        public class PluginPageViewModel
        {
            public string StoreId { get; set; } = string.Empty;
            public IEnumerable<LspProvider> AvailableLsps { get; set; } = Array.Empty<LspProvider>();
            public LspProvider? ConnectedLsp { get; set; }
            public string SelectedLspSlug { get; set; } = string.Empty;
            public LSPS1GetInfoResponse? LspInfo { get; set; }
            public string NodePublicKey { get; set; } = string.Empty;
            public bool UserHasLightningNode { get; set; }
            public bool UserNodeIsConnectedToLsp { get; set; }
            public bool UserNodeFailedToConnectToLsp { get; set; }
            
            // Serialized version for JavaScript
            public string LspInfoJson => LspInfo != null 
                ? JsonSerializer.Serialize(LspInfo) 
                : "null";
        }

        [HttpGet("api/nodepubkey")]
        public async Task<IActionResult> GetNodePublicKeyApi(string storeId)
        {
            var store = await _storeRepository.FindStore(storeId);
            if (store == null)
                return NotFound();
                
            var pubKey = await GetNodePublicKey(store);
            if (string.IsNullOrEmpty(pubKey))
                return NotFound("No Lightning node configured for this store");
                
            return Ok(new { pubKey });
        }
        
        [HttpPost("api/connect")]
        public async Task<IActionResult> ConnectToNodeApi(string storeId, [FromBody] ConnectNodeRequest request)
        {
            if (string.IsNullOrEmpty(request.NodeUri))
                return BadRequest("Node URI is required");
                
            var store = await _storeRepository.FindStore(storeId);
            if (store == null)
                return NotFound("Store not found");
                
            var success = await ConnectToNode(store, request.NodeUri);
            return Ok(new { success });
        }
        
        [HttpGet("api/channels")]
        public async Task<IActionResult> GetChannelsApi(string storeId)
        {
            var store = await _storeRepository.FindStore(storeId);
            if (store == null)
                return NotFound("Store not found");
                
            var channels = await GetLightningChannels(store);
            
            // Convert to simpler response model for API consumption
            // Using a more generic approach to avoid property name issues
            var channelsResponse = channels.Select(c => {
                // Extract what we can safely
                var response = new Dictionary<string, object>
                {
                    ["remotePubKey"] = c.RemoteNode?.ToString() ?? "",
                    ["capacity"] = c.Capacity.MilliSatoshi,
                    ["localBalance"] = c.LocalBalance?.MilliSatoshi ?? 0,
                    ["active"] = c.IsActive,
                    ["isPublic"] = c.IsPublic
                };
                
                // Try to add channel identifiers safely
                try {
                    // Different implementations might use different property names
                    response["channelId"] = c.ToString() ?? "unknown";
                }
                catch {
                    response["channelId"] = "unknown";
                }
                
                return response;
            });
            
            return Ok(channelsResponse);
        }
        
        public class ConnectNodeRequest
        {
            public string NodeUri { get; set; } = string.Empty;
        }
    }
}