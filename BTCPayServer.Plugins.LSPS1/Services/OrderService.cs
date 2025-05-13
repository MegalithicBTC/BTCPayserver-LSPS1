using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using BTCPayServer.Plugins.LSPS1.Models;
using Microsoft.Extensions.Logging;

namespace BTCPayServer.Plugins.LSPS1.Services
{
    public class OrderService
    {
        private readonly ILogger<OrderService> _logger;
        private readonly HttpClient _http;

        public OrderService(ILogger<OrderService> logger, HttpClient http)
        {
            _logger = logger;
            _http = http;
        }

        public async Task<(bool success, string message, string? invoiceId, string? orderId)> CreateChannelOrderAsync(
            string storeId, 
            LspProvider lsp,
            string nodePublicKey,
            long channelSizeInSats,
            bool isPrivateChannel = false)
        {
            try
            {
                _logger.LogInformation("Creating channel order with {Provider} for store {StoreId}, amount {Amount} sats, private: {IsPrivate}",
                    lsp.Name, storeId, channelSizeInSats, isPrivateChannel);
                
                // Prepare the order request with correct balance structure
                var orderUrl = $"{lsp.Url.TrimEnd('/')}/order";
                
                var orderRequest = new
                {
                    node_pubkey = nodePublicKey,
                    // Fix: Channel balance should go to LSP side (lsp_balance_sat), not client side
                    lsp_balance_sat = channelSizeInSats, // Corrected: LSP gets the balance
                    client_balance_sat = 0,             // Client starts with 0
                    required_channel_confirmations = 1,  // Standard (not zero-conf)
                    funding_confirms_within_blocks = 6,  // Standard confirmation target
                    channel_expiry_blocks = 13140,       // Similar to Megalith
                    token = "btcpay-lsp-plugin",         // Our identifier
                    announce_channel = !isPrivateChannel // Public by default unless private is selected
                };
                
                var requestContent = JsonSerializer.Serialize(orderRequest);
                _logger.LogInformation("Order request JSON: {RequestContent}", requestContent);
                
                // Send the order request
                var response = await _http.PostAsync(
                    orderUrl, 
                    new StringContent(requestContent, Encoding.UTF8, "application/json"));
                
                _logger.LogInformation("Order request status code: {StatusCode}", response.StatusCode);
                
                // Parse the response
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Order raw response: {ResponseContent}", responseContent);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("LSP returned non-success status code {StatusCode}: {Response}", 
                        response.StatusCode, responseContent);
                    
                    return (false, $"Error from {lsp.Name}: {response.StatusCode}", null, null);
                }
                
                // Parse the order response
                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    
                    var orderResponse = JsonSerializer.Deserialize<OrderResponse>(responseContent, options);
                    
                    if (orderResponse == null)
                    {
                        _logger.LogWarning("Failed to parse order response");
                        return (false, "Invalid response from LSP", null, null);
                    }
                    
                    _logger.LogInformation("Got payment request: {PaymentRequest}", 
                        orderResponse.PaymentRequest?.Substring(0, 20) + "...");
                    
                    // Return the bolt11 invoice and orderId (if available)
                    return (true, "Order created successfully", orderResponse.PaymentRequest, orderResponse.OrderId);
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Error parsing order response JSON: {Error}", ex.Message);
                    return (false, $"Error processing response: {ex.Message}", null, null);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating channel order: {Error}", ex.Message);
                return (false, $"Error: {ex.Message}", null, null);
            }
        }
        
        public async Task<(bool success, string message, OrderStatus? status)> GetOrderStatusAsync(
            LspProvider lsp,
            string orderId)
        {
            try
            {
                _logger.LogInformation("Fetching order status from {Provider} for order {OrderId}",
                    lsp.Name, orderId);
                
                // Prepare the order status request
                var statusUrl = $"{lsp.Url.TrimEnd('/')}/order/{orderId}";
                
                // Send the order status request
                var response = await _http.GetAsync(statusUrl);
                
                _logger.LogInformation("Order status request status code: {StatusCode}", response.StatusCode);
                
                // Parse the response
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Order status raw response: {ResponseContent}", responseContent);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("LSP returned non-success status code {StatusCode}: {Response}", 
                        response.StatusCode, responseContent);
                    
                    return (false, $"Error from {lsp.Name}: {response.StatusCode}", null);
                }
                
                // Parse the order status response
                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    };
                    
                    var orderStatus = JsonSerializer.Deserialize<OrderStatus>(responseContent, options);
                    
                    if (orderStatus == null)
                    {
                        _logger.LogWarning("Failed to parse order status response");
                        return (false, "Invalid status response from LSP", null);
                    }
                    
                    _logger.LogInformation("Got order status: {Status}", orderStatus.State);
                    
                    return (true, "Order status retrieved successfully", orderStatus);
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Error parsing order status JSON: {Error}", ex.Message);
                    return (false, $"Error processing status response: {ex.Message}", null);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving order status: {Error}", ex.Message);
                return (false, $"Error: {ex.Message}", null);
            }
        }

        private class OrderResponse
        {
            public string? PaymentRequest { get; set; }
            public string? PayHash { get; set; }
            public string? OrderId { get; set; }
        }
        
        public class OrderStatus
        {
            public string? OrderId { get; set; }
            public string? State { get; set; }
            public string? ChannelId { get; set; }
            public string? ErrorMessage { get; set; }
        }
    }
}