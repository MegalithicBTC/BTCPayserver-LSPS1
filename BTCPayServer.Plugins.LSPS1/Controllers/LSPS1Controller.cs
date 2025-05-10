using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BTCPayServer.Abstractions.Constants;
using BTCPayServer.Client;
using BTCPayServer.Plugins.LSPS1.Models;
using BTCPayServer.Plugins.LSPS1.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTCPayServer.Plugins.LSPS1.Controllers;

[Route("stores/{storeId}/plugins/lsps1")]
[Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie)]
public sealed class LSPS1Controller : Controller
{
    private readonly LSPS1Service _svc;
    public LSPS1Controller(LSPS1Service svc) => _svc = svc;

    [HttpGet("")]
    public async Task<IActionResult> Index(string storeId, [FromQuery] string? lsp = null)
    {
        // Try to connect to the LSP immediately when page loads
        var (ok, msg, connectedLsp) = await _svc.TryConnectToLspAsync(storeId, lsp);
        
        var vm = new PluginPageViewModel
        {
            StoreId = storeId,
            AvailableLsps = _svc.GetAllLsps(),
            ConnectionMessage = msg,
            ConnectionSuccessful = ok,
            ConnectedLsp = connectedLsp,
            SelectedLspSlug = lsp ?? connectedLsp?.Slug ?? string.Empty
        };
        
        return View(vm);
    }
    
    public class PluginPageViewModel
    {
        public string StoreId { get; set; } = string.Empty;
        public IEnumerable<LspProvider> AvailableLsps { get; set; } = Array.Empty<LspProvider>();
        public string ConnectionMessage { get; set; } = string.Empty;
        public bool ConnectionSuccessful { get; set; }
        public LspProvider? ConnectedLsp { get; set; }
        public string SelectedLspSlug { get; set; } = string.Empty;
    }
}