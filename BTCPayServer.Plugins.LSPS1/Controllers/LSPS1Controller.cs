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
        private readonly OrderService _orderService;
        private readonly ILogger<LSPS1Controller> _logger;

        public LSPS1Controller(
            LSPS1Service lsps1Service,
            LspProviderService lspProviderService,
            LightningNodeService lightningNodeService,
            OrderService orderService,
            ILogger<LSPS1Controller> logger)
        {
            _lsps1Service = lsps1Service;
            _lspProviderService = lspProviderService;
            _lightningNodeService = lightningNodeService;
            _orderService = orderService;
            _logger = logger;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(string storeId, [FromQuery] string? lsp = null)
        {
            // Get store for Lightning node information
            var store = await _lightningNodeService.GetStore(storeId);
            if (store == null)
                return NotFound();

            // First check if a valid Lightning node configuration exists
            string? nodePublicKey = await _lightningNodeService.GetNodePublicKey(store);
            bool userHasLightningNode = !string.IsNullOrEmpty(nodePublicKey);
            
            // Initialize variables - we don't connect to LSP yet until user requests it
            bool userNodeIsConnectedToLsp = false;
            bool userNodeFailedToConnectToLsp = false;
            LspProvider? connectedLsp = null;
            LSPS1GetInfoResponse? lspInfo = null;
            IEnumerable<Dictionary<string, object>> channels = Array.Empty<Dictionary<string, object>>();
            
            // Only get channels if user has a Lightning node
            if (userHasLightningNode)
            {
                // Get the user's current channels
                var lightningChannels = await _lightningNodeService.GetLightningChannels(store);
                channels = ConvertChannelsToClientFormat(lightningChannels);
                
                // Don't automatically connect to LSP on page load, wait for user to click "Get a Lightning Channel"
            }
            
            var vm = new PluginPageViewModel
            {
                StoreId = storeId,
                AvailableLsps = _lspProviderService.GetAllLsps(),
                ConnectedLsp = connectedLsp,
                SelectedLspSlug = lsp ?? "megalith-lsp", // Default to Megalith LSP if none selected
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
                userChannels = channels,
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
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });
            
            return View(vm);
        }
        
        [HttpGet("refresh-channels")]
        public async Task<IActionResult> RefreshChannels(string storeId)
        {
            try
            {
                _logger.LogInformation("Refreshing channels for store {StoreId}", storeId);
                
                // Get store
                var store = await _lightningNodeService.GetStore(storeId);
                if (store == null)
                    return Json(new { success = false, error = "Store not found" });
                
                // Get channels
                var lightningChannels = await _lightningNodeService.GetLightningChannels(store);
                var channels = ConvertChannelsToClientFormat(lightningChannels);
                
                return Json(new { success = true, channels });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing channels for store {StoreId}: {Error}", storeId, ex.Message);
                return Json(new { success = false, error = ex.Message });
            }
        }
        
        [HttpGet("get-lsp-info")]
        public async Task<IActionResult> GetLspInfo(string storeId, [FromQuery] string? lspSlug = null)
        {
            try
            {
                _logger.LogInformation("Getting LSP info for store {StoreId}, LSP {LspSlug}", storeId, lspSlug ?? "default");
                
                var result = await _lsps1Service.TryConnectToLspAsync(storeId, lspSlug);
                if (!result.success || result.selectedLsp == null)
                {
                    return Json(new { success = false, error = "Could not connect to LSP" });
                }
                
                var lspInfo = await _lsps1Service.GetLspInfoAsync(storeId, result.selectedLsp);
                if (lspInfo == null)
                {
                    return Json(new { success = false, error = "Failed to get LSP info" });
                }
                
                return Json(new { success = true, lspInfo, lspUrl = result.selectedLsp.Url });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting LSP info for store {StoreId}: {Error}", storeId, ex.Message);
                return Json(new { success = false, error = ex.Message });
            }
        }
        
        // Helper method to convert Lightning channels to a client-friendly format
        private IEnumerable<Dictionary<string, object>> ConvertChannelsToClientFormat(IEnumerable<BTCPayServer.Lightning.LightningChannel> channels)
        {
            return channels.Select(c => {
                // Extract what we can safely
                var response = new Dictionary<string, object>
                {
                    ["remotePubKey"] = c.RemoteNode?.ToString() ?? "",
                    ["capacity"] = c.Capacity.MilliSatoshi / 1000, // Convert msat to sat
                    ["localBalance"] = c.LocalBalance != null ? c.LocalBalance.MilliSatoshi / 1000 : 0, // Convert msat to sat
                    ["active"] = c.IsActive,
                    ["public"] = c.IsPublic
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
    }
}