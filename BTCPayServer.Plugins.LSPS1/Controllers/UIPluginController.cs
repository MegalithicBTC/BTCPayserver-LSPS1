// using System.Collections.Generic;
// using System.Threading.Tasks;
// using BTCPayServer.Abstractions.Constants;
// using BTCPayServer.Client;
// using BTCPayServer.Plugins.Template.Data;
// using BTCPayServer.Plugins.Template.Services;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;

// namespace BTCPayServer.Plugins.Template;

// [Route("~/plugins/template")]
// [Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie, Policy = Policies.CanViewProfile)]
// public class UIPluginController : Controller
// {
//     private readonly MyPluginService _PluginService;

//     public UIPluginController(MyPluginService PluginService)
//     {
//         _PluginService = PluginService;
//     }

//     // GET
//     public async Task<IActionResult> Index()
//     {
//         return View(new PluginPageViewModel { Data = await _PluginService.Get() });
//     }
// }

// public class PluginPageViewModel
// {
//     public List<PluginData> Data { get; set; }
// }


using System.Collections.Generic;
using System.Threading.Tasks;
using BTCPayServer.Abstractions.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BTCPayServer.Plugins.LSPS1.Services;

namespace BTCPayServer.Plugins.LSPS1;

[Route("~/plugins/lsps1")]
// [Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie,
//            Policy = Policies.CanViewProfile)]
[Authorize(AuthenticationSchemes = AuthenticationSchemes.Cookie)]
public class UIPluginController : Controller
{
    private readonly LSPS1Service _service;

    public UIPluginController(LSPS1Service service)
    {
        _service = service;
    }

    public async Task<IActionResult> Index()
    {
        var vm = new PluginPageViewModel { Data = await _service.GetAsync() };
        return View(vm);
    }
}

public class PluginPageViewModel
{
    public List<PluginData> Data { get; set; }
}