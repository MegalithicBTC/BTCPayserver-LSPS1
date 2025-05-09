using System.Threading.Tasks;
using BTCPayServer.Abstractions.Constants;   // <- gives us Permission.*
using BTCPayServer.Client;  
using BTCPayServer.Plugins.LSPS1.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;



namespace BTCPayServer.Plugins.LSPS1;

[Route("stores/{storeId}/plugins/lsps1")]
[Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie,
          Policy = Policies.CanModifyStoreSettings)]  // <-- ✅ correct constant
public sealed class LSPS1Controller : Controller
{
    private readonly LSPS1Service _svc;
    public LSPS1Controller(LSPS1Service svc) => _svc = svc;

    [HttpPost("get-info-connect")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> GetInfoAndMaybeConnect(string storeId)
    {
        var (ok, msg) = await _svc.CheckAndConnectAsync(storeId);
        return Json(new { ok, msg });
    }
}