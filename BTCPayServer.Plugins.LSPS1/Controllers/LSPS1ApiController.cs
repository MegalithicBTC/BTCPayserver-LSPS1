using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BTCPayServer.Abstractions.Constants;
using BTCPayServer.Data;
using BTCPayServer.Plugins.LSPS1.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace BTCPayServer.Plugins.LSPS1.Controllers
{
    [Route("stores/{storeId}/plugins/lsps1/api")]
    [Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie)]
    [ApiController]
    public class LSPS1ApiController : ControllerBase
    {
        private readonly ILogger<LSPS1ApiController> _logger;
        private readonly LightningNodeService _lightningNodeService;
        private readonly LSPS1Service _lsps1Service;

        public LSPS1ApiController(
            ILogger<LSPS1ApiController> logger,
            LightningNodeService lightningNodeService,
            LSPS1Service lsps1Service)
        {
            _logger = logger;
            _lightningNodeService = lightningNodeService;
            _lsps1Service = lsps1Service;
        }

        [HttpGet("nodepubkey")]
        public async Task<IActionResult> GetNodePublicKeyApi(string storeId)
        {
            var store = await _lightningNodeService.GetStore(storeId);
            if (store == null)
                return NotFound("Store not found");
                
            var pubKey = await _lightningNodeService.GetNodePublicKey(store);
            if (string.IsNullOrEmpty(pubKey))
                return NotFound("No Lightning node configured for this store");
                
            return Ok(new { pubKey });
        }
        
        [HttpPost("connect")]
        public async Task<IActionResult> ConnectToNodeApi(string storeId, [FromBody] ConnectNodeRequest request)
        {
            if (string.IsNullOrEmpty(request.NodeUri))
                return BadRequest("Node URI is required");
                
            var store = await _lightningNodeService.GetStore(storeId);
            if (store == null)
                return NotFound("Store not found");
                
            var success = await _lightningNodeService.ConnectToNode(store, request.NodeUri);
            return Ok(new { success });
        }
        
        [HttpGet("channels")]
        public async Task<IActionResult> GetChannelsApi(string storeId)
        {
            var store = await _lightningNodeService.GetStore(storeId);
            if (store == null)
                return NotFound("Store not found");
                
            var channels = await _lightningNodeService.GetLightningChannels(store);
            
            // Convert to simpler response model for API consumption
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