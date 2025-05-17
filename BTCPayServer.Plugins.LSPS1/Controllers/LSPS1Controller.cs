using BTCPayServer.Abstractions.Constants;
using BTCPayServer.Plugins.LSPS1.Models;
using BTCPayServer.Plugins.LSPS1.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace BTCPayServer.Plugins.LSPS1.Controllers
{
    [Route("stores/{storeId}/plugins/lsps1")]
    [Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie)]
    public sealed class LSPS1Controller : Controller
    {
        private readonly LSPS1Service _lsps1Service;
        private readonly LspProviderService _lspProviderService;
        private readonly LightningNodeService _lightningNodeService;
        private readonly ILogger<LSPS1Controller> _logger;

        public LSPS1Controller(
            LSPS1Service lsps1Service,
            LspProviderService lspProviderService,
            LightningNodeService lightningNodeService,
            ILogger<LSPS1Controller> logger)
        {
            _lsps1Service = lsps1Service;
            _lspProviderService = lspProviderService;
            _lightningNodeService = lightningNodeService;
            _logger = logger;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(string storeId)
        {
            _logger.LogInformation("LSPS1Controller: Index request for store {StoreId}", storeId);
            
            // Get store for Lightning node information
            var store = await _lightningNodeService.GetStore(storeId);
            if (store == null)
            {
                _logger.LogWarning("LSPS1Controller: Store {StoreId} not found", storeId);
                return NotFound();
            }

            _logger.LogInformation("LSPS1Controller: Found store {StoreId}, Name: {StoreName}", storeId, store.StoreName);

            // First check if a valid Lightning node configuration exists
            string? nodePublicKey = await _lightningNodeService.GetNodePublicKey(store);
            _logger.LogInformation("LSPS1Controller: Node public key result: {NodePublicKey}", nodePublicKey ?? "null");
            
            bool userHasLightningNode = !string.IsNullOrEmpty(nodePublicKey);
            _logger.LogInformation("LSPS1Controller: User has Lightning node: {UserHasLightningNode}", userHasLightningNode);
            
            // Initialize variables - we don't connect to LSP yet until user requests it
            bool userNodeIsConnectedToLsp = false;
            bool userNodeFailedToConnectToLsp = false;
            LspProvider? connectedLsp = null;
            LSPS1GetInfoResponse? lspInfo = null;
            
            var vm = new PluginPageViewModel
            {
                StoreId = storeId,
                AvailableLsps = _lspProviderService.GetAllLsps(),
                ConnectedLsp = connectedLsp,
                SelectedLspSlug = "megalith-lsp", 
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
                lspInfo = lspInfo != null ? lspInfo : null, // Pass actual object to JSON serializer
                lspUrl = connectedLsp?.Url ?? string.Empty, // Add direct LSP URL for client-side API calls
                nodePublicKey = vm.NodePublicKey,
                userHasLightningNode = vm.UserHasLightningNode,
                availableLsps = vm.AvailableLsps.Select(lsp => new 
                {
                    slug = lsp.Slug,
                    name = lsp.Name,
                    url = lsp.Url,
                    selected = lsp.Slug == vm.SelectedLspSlug
                })
            };
            
            // Serialize the data for the client
            ViewBag.ClientDataJson = JsonSerializer.Serialize(clientData, new JsonSerializerOptions 
            { 
                // Don't use PropertyNamingPolicy to preserve original property names (snake_case)
                PropertyNamingPolicy = null,
                WriteIndented = false
            });
            
            return View(vm);
        }
        
        // Old endpoint commented out since JavaScript now fetches LSP info directly
        /*
        [HttpGet("get-lsp-info")]
        public async Task<IActionResult> GetLspInfo(string storeId, [FromQuery] string? lspSlug = null)
        {
            try
            {
                _logger.LogInformation("Getting LSP info for store {StoreId}, LSP {LspSlug}", storeId, lspSlug ?? "default");
                
                var result = await _lsps1Service.TryConnectToLspAsync(storeId, lspSlug);
                if (!result.success || result.selectedLsp == null)
                {
                    return Json(new { success = false, error = result.message });
                }
                
                // Use the LspInfo property already set in the selectedLsp object by TryConnectToLspAsync
                var lspInfo = result.selectedLsp.LspInfo;
                if (lspInfo == null)
                {
                    return Json(new { success = false, error = "Failed to get LSP info" });
                }
                
                // Configure Json serialization to prevent camelCase conversion
                return new JsonResult(new { success = true, lspInfo, lspUrl = result.selectedLsp.Url }, 
                    new JsonSerializerOptions { PropertyNamingPolicy = null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting LSP info for store {StoreId}: {Error}", storeId, ex.Message);
                return Json(new { success = false, error = ex.Message });
            }
        }
        */
        
        [HttpPost("connect-node")]
        public async Task<IActionResult> ConnectNode(string storeId, [FromBody] ConnectNodeRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Uri))
            {
                return BadRequest(new { success = false, error = "No node URI provided" });
            }

            try
            {
                _logger.LogInformation("Connecting node for store {StoreId} to URI {Uri}", storeId, request.Uri);
                
                // Get a store instance to use for connecting
                var store = await _lightningNodeService.GetStore(storeId);
                if (store == null)
                {
                    _logger.LogWarning("Store {StoreId} not found", storeId);
                    return NotFound(new { success = false, error = "Store not found" });
                }
                
                // Attempt to connect to the node
                bool success = await _lightningNodeService.ConnectToNode(store, request.Uri);
                
                if (success)
                {
                    _logger.LogInformation("Successfully connected to node {Uri} for store {StoreId}", request.Uri, storeId);
                    return Json(new { success = true });
                }
                else
                {
                    _logger.LogWarning("Failed to connect to node {Uri} for store {StoreId}", request.Uri, storeId);
                    return Json(new { success = false, error = $"Failed to connect to {request.Uri}" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to node for store {StoreId}: {Error}", storeId, ex.Message);
                return Json(new { success = false, error = ex.Message });
            }
        }
        
        public class ConnectNodeRequest
        {
            public string Uri { get; set; } = string.Empty;
            public string LspSlug { get; set; } = string.Empty;
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
                ? JsonSerializer.Serialize(LspInfo, new JsonSerializerOptions { PropertyNamingPolicy = null }) 
                : "null";
        }
    }
}