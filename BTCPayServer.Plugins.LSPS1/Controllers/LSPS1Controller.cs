using BTCPayServer.Abstractions.Constants;
using BTCPayServer.Client;
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

            // Try to connect to the LSP immediately when page loads
            var result = await _svc.TryConnectToLspAsync(storeId, lsp);
            bool ok = result.success;
            string msg = result.message;
            LspProvider? connectedLsp = result.selectedLsp;
            
            // Fetch LSP info if connected
            LSPS1GetInfoResponse? lspInfo = null;
            if (ok && connectedLsp != null)
            {
                lspInfo = await _svc.GetLspInfoAsync(storeId, connectedLsp);
            }
            
            // Get node's public key
            string? nodePublicKey = await GetNodePublicKey(store);
            
            var vm = new PluginPageViewModel
            {
                StoreId = storeId,
                AvailableLsps = _svc.GetAllLsps(),
                ConnectionMessage = msg,
                ConnectionSuccessful = ok,
                ConnectedLsp = connectedLsp,
                SelectedLspSlug = lsp ?? connectedLsp?.Slug ?? string.Empty,
                LspInfo = lspInfo,
                NodePublicKey = nodePublicKey ?? string.Empty
            };
            
            return View(vm);
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
            public string ConnectionMessage { get; set; } = string.Empty;
            public bool ConnectionSuccessful { get; set; }
            public LspProvider? ConnectedLsp { get; set; }
            public string SelectedLspSlug { get; set; } = string.Empty;
            public LSPS1GetInfoResponse? LspInfo { get; set; }
            public string NodePublicKey { get; set; } = string.Empty;
            
            // Serialized version for JavaScript
            public string LspInfoJson => LspInfo != null 
                ? JsonSerializer.Serialize(LspInfo) 
                : "null";
        }
    }
}