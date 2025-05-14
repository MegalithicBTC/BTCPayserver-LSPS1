// LSP Config Manager - Handles LSP config formatting and option parsing
window.LspConfigManager = {
  
  /**
   * Process channel options from LSP info
   * @param {Object} lspInfo - LSP information from get_info endpoint
   * @returns {Object} Processed channel options
   */
  processChannelOptions(lspInfo) {
    if (!lspInfo || Object.keys(lspInfo).length === 0) {
      console.warn("No LSP info or options available");
      return null;
    }
    
    console.log("Processing LSP channel options from:", lspInfo);
    
    // Extract min and max channel sizes, handling various property naming conventions
    const minSats = this.getNumberProperty(
      lspInfo,
      ['min_initial_client_balance_sat', 'minInitialClientBalanceSat', 'min_channel_balance_sat', 'minChannelBalanceSat'],
      100000 // Default 100k sats
    );
    
    const maxSats = this.getNumberProperty(
      lspInfo,
      ['max_initial_client_balance_sat', 'maxInitialClientBalanceSat', 'max_channel_balance_sat', 'maxChannelBalanceSat'],
      16777215 // Default ~16.7M sats (max LN payment)
    );
    
    // Use a reasonable default channel size
    const defaultSats = this.getNumberProperty(
      lspInfo, 
      ['recommended_channel_balance', 'recommendedChannelBalance'],
      1000000 // Default 1M sats
    );
    
    // Extract fee rate percentage
    const feeRatePercent = this.getFeeRatePercent(lspInfo);
    
    // Calculate some useful properties
    const minFee = Math.round(minSats * feeRatePercent / 100);
    const maxFee = Math.round(maxSats * feeRatePercent / 100);
    
    // Build and return the options object with defaults for any missing properties
    return {
      minChannelSize: minSats,
      maxChannelSize: maxSats,
      defaultChannelSize: Math.min(Math.max(defaultSats, minSats), maxSats),
      minSats: minSats, // Add explicit properties for the slider component
      maxSats: maxSats,
      minFee: minFee,
      maxFee: maxFee,
      feeRatePercent: feeRatePercent,
      instantSwap: this.getBooleanProperty(lspInfo, ['supports_zero_conf', 'supportsZeroConf'], false),
      zeroReserve: this.getBooleanProperty(lspInfo, ['supports_zero_channel_reserve', 'supportsZeroChannelReserve'], false)
    };
  },
  
  /**
   * Calculate fee for a channel size
   * @param {number} channelSize - Channel size in satoshis
   * @param {Object} options - Channel options
   * @returns {number} Fee in satoshis
   */
  calculateFee(channelSize, options) {
    if (!options) {
      console.warn("No channel options available for fee calculation");
      return 0;
    }
    
    const size = parseFloat(channelSize);
    const feeRate = options.feeRatePercent || 0.1;
    return Math.round(size * feeRate / 100);
  },
  
  /**
   * Validate if a channel size is within the allowed range
   * @param {number} channelSize - Channel size in satoshis
   * @param {Object} options - Channel options
   * @returns {boolean} Whether size is valid
   */
  validateChannelSize(channelSize, options) {
    if (!options) return false;
    
    const size = parseFloat(channelSize);
    return size >= options.minChannelSize && size <= options.maxChannelSize;
  },
  
  /**
   * Get a numeric property from an object with fallbacks for different keys
   * @param {Object} obj - The object to extract from
   * @param {Array<string>} keys - Keys to try in order
   * @param {number} defaultValue - Default value if no key is found
   * @returns {number} The extracted number value
   */
  getNumberProperty(obj, keys, defaultValue) {
    if (!obj) return defaultValue;
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        // Handle both string and number formats
        return typeof obj[key] === 'string' ? parseInt(obj[key], 10) : obj[key];
      }
    }
    
    return defaultValue;
  },
  
  /**
   * Get a boolean property from an object with fallbacks for different keys
   * @param {Object} obj - The object to extract from
   * @param {Array<string>} keys - Keys to try in order
   * @param {boolean} defaultValue - Default value if no key is found
   * @returns {boolean} The extracted boolean value
   */
  getBooleanProperty(obj, keys, defaultValue) {
    if (!obj) return defaultValue;
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return !!obj[key];
      }
    }
    
    return defaultValue;
  },
  
  /**
   * Get the fee rate percentage from various possible formats
   * @param {Object} lspInfo - LSP information object
   * @returns {number} Fee rate percentage (e.g., 0.1 for 0.1%)
   */
  getFeeRatePercent(lspInfo) {
    if (!lspInfo) return 0.1; // Default 0.1%
    
    // Try different property names and formats
    if (lspInfo.channel_fee_rate !== undefined) {
      // Often provided as parts per million (1,000,000 = 100%)
      return lspInfo.channel_fee_rate / 10000; // Convert ppm to percentage
    }
    
    if (lspInfo.channelFeeRate !== undefined) {
      return lspInfo.channelFeeRate / 10000; // Convert ppm to percentage
    }
    
    if (lspInfo.fee_rate_percent !== undefined) {
      return parseFloat(lspInfo.fee_rate_percent);
    }
    
    if (lspInfo.feeRatePercent !== undefined) {
      return parseFloat(lspInfo.feeRatePercent);
    }
    
    return 0.1; // Default 0.1%
  }
};