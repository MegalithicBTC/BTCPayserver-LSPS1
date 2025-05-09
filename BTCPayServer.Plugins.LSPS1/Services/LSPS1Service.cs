using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace BTCPayServer.Plugins.LSPS1.Services;

public record PluginData(string Key, string Value);

public class LSPS1Service
{
    private readonly ILogger<LSPS1Service> _log;

    public LSPS1Service(ILogger<LSPS1Service> log)
    {
        _log = log;
    }

    /// <summary>
    /// Replace this with real logic later.
    /// </summary>
    public Task<List<PluginData>> GetAsync()
    {
        var sample = new List<PluginData>
        {
            new("Example", "Your plugin is loaded!"),
            new("Time",    System.DateTimeOffset.UtcNow.ToString("u"))
        };
        return Task.FromResult(sample);
    }
}