using System;
using BTCPayServer.Plugins.LSPS1.Models;

namespace BTCPayServer.Plugins.LSPS1.Models
{
    public class LspProvider
    {
        // Add setter to make it writable
        public string Slug { get; set; } = string.Empty;
        
        public string Name { get; set; } = string.Empty;
        
        public string Url { get; set; } = string.Empty;
        
        // Store the LSP info to avoid redundant API calls
        public LSPS1GetInfoResponse? LspInfo { get; set; }
        
        // You might want to derive the slug from the name if not explicitly set
        public string GetSlug()
        {
            if (!string.IsNullOrEmpty(Slug))
                return Slug;
                
            // Default behavior: convert name to lowercase with hyphens
            return Name.ToLowerInvariant()
                .Replace(" ", "-")
                .Replace(".", "")
                + "-lsp";
        }
    }
}