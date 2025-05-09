using System.Threading.Tasks;
using BTCPayServer.Abstractions.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTCPayServer.Plugins.LSPS1.Controllers;

[Route("~/plugins/lsps1")]
[Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie)]
public class UIPluginController : Controller
{
    [HttpGet]
    public IActionResult Index(string storeId)
    {
        var vm = new PluginPageViewModel { 
            StoreId = storeId ?? string.Empty
        };
        
        return View(vm);
    }
    
    public class PluginPageViewModel
    {
        public string StoreId { get; set; } = string.Empty;
    }
}