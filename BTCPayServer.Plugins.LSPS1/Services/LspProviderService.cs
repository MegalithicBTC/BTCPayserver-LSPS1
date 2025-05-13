using System.Collections.Generic;
using System.Linq;
using BTCPayServer.Plugins.LSPS1.Models;
using Microsoft.Extensions.Logging;

namespace BTCPayServer.Plugins.LSPS1.Services
{
    public class LspProviderService
    {
        private readonly ILogger<LspProviderService> _logger;

        public LspProviderService(ILogger<LspProviderService> logger)
        {
            _logger = logger;
        }

        public IEnumerable<LspProvider> GetAllLsps()
        {
            // Return available LSPs with proper API URLs including the version (/v1/)
            return new List<LspProvider>
            {
                new LspProvider { 
                    Slug = "megalith-lsp", 
                    Name = "Megalith LSP", 
                    Url = "https://megalithic.me/api/lsps1/v1" 
                },
                new LspProvider { 
                    Slug = "olympus-lsp", 
                    Name = "Olympus LSP", 
                    Url = "https://lsps1.lnolymp.us/api/v1" 
                },
                new LspProvider { 
                    Slug = "flashsats-lsp", 
                    Name = "Flashsats LSP", 
                    Url = "https://lsp.flashsats.xyz/api/v1" 
                }
            };
        }

        public LspProvider? GetLspBySlug(string? slug)
        {
            if (string.IsNullOrEmpty(slug))
            {
                return GetAllLsps().FirstOrDefault();
            }

            return GetAllLsps().FirstOrDefault(l => l.Slug == slug);
        }
    }
}