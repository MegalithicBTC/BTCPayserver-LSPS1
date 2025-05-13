// Plugin.cs
using BTCPayServer.Abstractions.Contracts;
using BTCPayServer.Abstractions.Models;
using BTCPayServer.Abstractions.Services;
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
        // Register UI extensions
        services.AddUIExtension("header-nav", "LSPS1/NavExtension");
        
        // If your plugin needs to be visible under the Lightning section, add this extension point too
        services.AddUIExtension("lightning-nav", "LSPS1/LightningNavExtension");

        // tiny service with HttpClient + lightning helpers
        services.AddHttpClient<LSPS1Service>();
    }
}