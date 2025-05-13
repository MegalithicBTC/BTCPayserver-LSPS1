using System;
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
        private readonly ILogger<LSPS1Service> _logger;
        private readonly LspProviderService _lspProviderService;
        private readonly LightningNodeService _lightningNodeService;

        public LSPS1Service(
            HttpClient http, 
            ILogger<LSPS1Service> logger,
            LspProviderService lspProviderService,
            LightningNodeService lightningNodeService)
        {
            _http = http;
            _logger = logger;
            _lspProviderService = lspProviderService;
            _lightningNodeService = lightningNodeService;
        }

        public async Task<(bool success, string message, LspProvider? selectedLsp)> TryConnectToLspAsync(string storeId, string? lspSlug)
        {
            try
            {
                // If no LSP is selected, return the first one as default
                var selectedLsp = _lspProviderService.GetLspBySlug(lspSlug);
                if (selectedLsp == null)
                {
                    return (false, $"LSP with slug '{lspSlug ?? "unknown"}' not found", null);
                }

                _logger.LogInformation("Attempting to connect to LSP {LspName} ({LspSlug}) for store {StoreId}", 
                    selectedLsp.Name, selectedLsp.Slug, storeId);

                // Get LSP info first to get the node URIs
                var infoUrl = $"{selectedLsp.Url.TrimEnd('/')}/get_info";
                
                _logger.LogInformation("Fetching node info from {Url}", infoUrl);
                HttpResponseMessage response;
                
                try
                {
                    // Add a timeout to the request
                    var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    response = await _http.GetAsync(infoUrl, cts.Token);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("LSP returned non-success status code {StatusCode}", response.StatusCode);
                        return (false, $"Failed to connect to {selectedLsp.Name}: HTTP {response.StatusCode}", null);
                    }
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "Failed to connect to LSP at {Url}: {Error}", infoUrl, ex.Message);
                    return (false, $"Failed to connect to {selectedLsp.Name}: {ex.Message}", null);
                }
                catch (TaskCanceledException)
                {
                    _logger.LogWarning("Request to LSP at {Url} timed out", infoUrl);
                    return (false, $"Connection to {selectedLsp.Name} timed out", null);
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                
                // Parse the response to get the node URIs
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                var lspInfo = JsonSerializer.Deserialize<LSPS1GetInfoResponse>(responseContent, options);

                if (lspInfo == null || lspInfo.Uris == null || lspInfo.Uris.Length == 0)
                {
                    _logger.LogWarning("LSP info response doesn't contain valid URIs");
                    return (false, $"Invalid response from {selectedLsp.Name}", null);
                }

                // Connect to the LSP nodes using the Lightning client
                _logger.LogInformation("LSP node URIs found: {Uris}", string.Join(", ", lspInfo.Uris));
                
                // Try to connect to each node URI until one succeeds
                bool anySuccessfulConnection = false;
                string connectionError = string.Empty;
                
                // Get a store instance to use for connecting
                var store = await _lightningNodeService.GetStore(storeId);
                if (store == null)
                {
                    _logger.LogWarning("Store {StoreId} not found", storeId);
                    return (false, "Store not found", null);
                }
                
                foreach (var uri in lspInfo.Uris)
                {
                    bool success = await _lightningNodeService.ConnectToNode(store, uri);
                    if (success)
                    {
                        anySuccessfulConnection = true;
                        break;
                    }
                    else
                    {
                        connectionError = $"Could not connect to {uri}";
                    }
                }
                
                if (anySuccessfulConnection)
                {
                    _logger.LogInformation("Successfully connected to {LspName}", selectedLsp.Name);
                    return (true, $"Successfully connected to {selectedLsp.Name}", selectedLsp);
                }
                else
                {
                    _logger.LogWarning("Failed to connect to any {LspName} nodes", selectedLsp.Name);
                    return (false, $"Failed to connect to {selectedLsp.Name}: {connectionError}", null);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error connecting to LSP: {Message}", ex.Message);
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
                
                _logger.LogInformation("Fetching LSPS1 info from {Url}", infoUrl);
                HttpResponseMessage response;
                
                try
                {
                    // Add a timeout to the request
                    var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    response = await _http.GetAsync(infoUrl, cts.Token);
                    
                    _logger.LogInformation("LSP response status code: {StatusCode}", response.StatusCode);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("LSP returned non-success status code {StatusCode}", response.StatusCode);
                        return null;
                    }
                }
                catch (HttpRequestException ex)
                {
                    _logger.LogWarning(ex, "Failed to connect to LSP at {Url}: {Error}", infoUrl, ex.Message);
                    return null;
                }
                catch (TaskCanceledException ex)
                {
                    _logger.LogWarning(ex, "Request to LSP at {Url} timed out", infoUrl);
                    return null;
                }
                
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("LSP response raw content: {Content}", responseContent);
                
                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    var result = JsonSerializer.Deserialize<LSPS1GetInfoResponse>(responseContent, options);
                    
                    if (result != null)
                    {
                        _logger.LogInformation("Successfully parsed LSP info data");
                        
                        // Log some of the data to verify
                        _logger.LogInformation("LSP URIs: {Uris}", 
                            result.Uris != null ? string.Join(", ", result.Uris) : "none");
                        _logger.LogInformation("LSP min balance: {MinBalance}", result.MinInitialClientBalanceSat);
                        
                        return result;
                    }
                    else
                    {
                        _logger.LogWarning("Deserialized LSP info is null");
                        return null;
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Error deserializing LSP response: {Error}", ex.Message);
                    _logger.LogInformation("Raw response content that failed to deserialize: {Content}", responseContent);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error fetching LSP info for {LspName}: {Error}", lsp.Name, ex.Message);
                return null;
            }
        }
    }
}