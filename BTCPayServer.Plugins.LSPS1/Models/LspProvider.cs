using System;

namespace BTCPayServer.Plugins.LSPS1.Models;

public class LspProvider
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Slug => GenerateSlug(Name);

    private static string GenerateSlug(string name) =>
        name.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace(".", "")
            .Replace(",", "");
}