using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BTCPayServer.Plugins.LSPS1.Models;
using Microsoft.Extensions.Logging;

namespace BTCPayServer.Plugins.LSPS1.Services
{
    public class LSPS1Service
    {
        private readonly HttpClient _http;
        private readonly ILogger<LSPS1Service> _log;

        public LSPS1Service(HttpClient http, ILogger<LSPS1Service> logger)
        {
            _http = http;
            _log = logger;
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

        public async Task<(bool success, string message, LspProvider? selectedLsp)> TryConnectToLspAsync(string storeId, string? lspSlug)
        {
            try
            {
                // If no LSP is selected, return the first one as default
                if (string.IsNullOrEmpty(lspSlug))
                {
                    var defaultLsp = GetAllLsps().FirstOrDefault();
                    if (defaultLsp == null)
                    {
                        return (false, "No LSPs available", null);
                    }
                    return (true, $"Connected to default LSP ({defaultLsp.Name})", defaultLsp);
                }

                // Find the LSP by slug
                var selectedLsp = GetAllLsps().FirstOrDefault(l => l.Slug == lspSlug);
                if (selectedLsp == null)
                {
                    return (false, $"LSP with slug '{lspSlug}' not found", null);
                }

                // TODO: Implement actual connection logic here (token exchange, etc.)
                // For now, simulate a network call to make the method truly async
                await Task.Delay(10); // Small delay to make this a true async method
                
                return (true, $"Successfully connected to {selectedLsp.Name}", selectedLsp);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Error connecting to LSP: {Message}", ex.Message);
                return (false, $"Error: {ex.Message}", null);
            }
        }

        public async Task<LSPS1GetInfoResponse?> GetLspInfoAsync(string storeId, LspProvider lsp)
        {
            try
            {
                // Step 1 – fetch get_info from the LSP
                // Now we just append the endpoint name since the URL already contains /v1/
                var infoUrl = $"{lsp.Url.TrimEnd('/')}/get_info";
                
                _log.LogInformation("Fetching LSPS1 info from {Url}", infoUrl);
                HttpResponseMessage response;
                
                try
                {
                    // Add a timeout to the request
                    var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    response = await _http.GetAsync(infoUrl, cts.Token);
                    
                    _log.LogInformation("LSP response status code: {StatusCode}", response.StatusCode);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        _log.LogWarning("LSP returned non-success status code {StatusCode}", response.StatusCode);
                        return null;
                    }
                }
                catch (HttpRequestException ex)
                {
                    _log.LogWarning(ex, "Failed to connect to LSP at {Url}: {Error}", infoUrl, ex.Message);
                    return null;
                }
                catch (TaskCanceledException ex)
                {
                    _log.LogWarning(ex, "Request to LSP at {Url} timed out", infoUrl);
                    return null;
                }
                
                var responseContent = await response.Content.ReadAsStringAsync();
                _log.LogInformation("LSP response raw content: {Content}", responseContent);
                
                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    var result = JsonSerializer.Deserialize<LSPS1GetInfoResponse>(responseContent, options);
                    
                    if (result != null)
                    {
                        _log.LogInformation("Successfully parsed LSP info data");
                        
                        // Log some of the data to verify
                        _log.LogInformation("LSP URIs: {Uris}", 
                            result.Uris != null ? string.Join(", ", result.Uris) : "none");
                        _log.LogInformation("LSP min balance: {MinBalance}", result.MinInitialClientBalanceSat);
                        
                        return result;
                    }
                    else
                    {
                        _log.LogWarning("Deserialized LSP info is null");
                        return null;
                    }
                }
                catch (JsonException ex)
                {
                    _log.LogError(ex, "Error deserializing LSP response: {Error}", ex.Message);
                    _log.LogInformation("Raw response content that failed to deserialize: {Content}", responseContent);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unexpected error fetching LSP info for {LspName}: {Error}", lsp.Name, ex.Message);
                return null;
            }
        }
    }
}