using System.Text.Json.Serialization;

namespace BTCPayServer.Plugins.LSPS1.Models;

public class LSPS1GetInfoResponse
{
    [JsonPropertyName("uris")]
    public string[]? Uris { get; set; }
    
    [JsonPropertyName("min_required_channel_confirmations")]
    public ushort MinRequiredChannelConfirmations { get; set; }
    
    [JsonPropertyName("min_funding_confirms_within_blocks")]
    public ushort MinFundingConfirmsWithinBlocks { get; set; }
    
    [JsonPropertyName("supports_zero_channel_reserve")]
    public bool SupportsZeroChannelReserve { get; set; }
    
    [JsonPropertyName("max_channel_expiry_blocks")]
    public uint MaxChannelExpiryBlocks { get; set; }
    
    [JsonPropertyName("min_initial_client_balance_sat")]
    public string MinInitialClientBalanceSat { get; set; } = string.Empty;
    
    [JsonPropertyName("max_initial_client_balance_sat")]
    public string MaxInitialClientBalanceSat { get; set; } = string.Empty;
    
    [JsonPropertyName("min_initial_lsp_balance_sat")]
    public string MinInitialLspBalanceSat { get; set; } = string.Empty;
    
    [JsonPropertyName("max_initial_lsp_balance_sat")]
    public string MaxInitialLspBalanceSat { get; set; } = string.Empty;
    
    [JsonPropertyName("min_channel_balance_sat")]
    public string MinChannelBalanceSat { get; set; } = string.Empty;
    
    [JsonPropertyName("max_channel_balance_sat")]
    public string MaxChannelBalanceSat { get; set; } = string.Empty;
}