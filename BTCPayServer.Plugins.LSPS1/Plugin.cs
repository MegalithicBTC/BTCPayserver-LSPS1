// Plugin.cs
// using BTCPayServer.Abstractions.Plugins;   // BaseBTCPayServerPlugin
using BTCPayServer.Abstractions.Contracts; // IUIExtension.PluginDependency
using BTCPayServer.Abstractions.Models;    // UIExtension
using BTCPayServer.Abstractions.Services;  // IUIExtension
using BTCPayServer.Plugins.LSPS1.Services;
using Microsoft.Extensions.DependencyInjection;

namespace BTCPayServer.Plugins.LSPS1;

public class Plugin : BaseBTCPayServerPlugin
{
    public override IBTCPayServerPlugin.PluginDependency[] Dependencies { get; } =
    {
        new() { Identifier = nameof(BTCPayServer), Condition = ">=1.12.0" }
    };

    public override void Execute(IServiceCollection services)
    {
        // Adds a link in the BTCPay header (zone "header-nav")
        services.AddSingleton<IUIExtension>(
            new UIExtension("Lsps1PluginHeaderNav", "header-nav"));

        // Your lightweight, no-DB service
        services.AddSingleton<LSPS1Service>();
    }
}