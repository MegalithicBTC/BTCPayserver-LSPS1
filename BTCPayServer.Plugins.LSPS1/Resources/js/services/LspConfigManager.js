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
    
    // Extract min and max channel sizes directly from LSPS1 spec fields
    const minSats = this.getNumberProperty(lspInfo, 'min_initial_client_balance_sat');
    const maxSats = this.getNumberProperty(lspInfo, 'max_initial_client_balance_sat');
    const minLspBalance = this.getNumberProperty(lspInfo, 'min_initial_lsp_balance_sat');
    const maxLspBalance = this.getNumberProperty(lspInfo, 'max_initial_lsp_balance_sat');
    
    // Use the appropriate min/max values
    const minChannelSize = minSats;
    const maxChannelSize = maxSats;
    
    // Use 1M sats as default channel size, constrained by min/max
    const defaultSats = Math.min(Math.max(1000000, minChannelSize), maxChannelSize);
    
    console.log("Channel option calculations:", {
      minSats, maxSats, minChannelSize, maxChannelSize, defaultSats
    });
    
    // Build and return the options object
    return {
      minChannelSize: minChannelSize,
      maxChannelSize: maxChannelSize,
      defaultChannelSize: defaultSats,
      minSats: minChannelSize,
      maxSats: maxChannelSize,
      instantSwap: lspInfo.min_required_channel_confirmations === 0,
      zeroReserve: !!lspInfo.supports_zero_channel_reserve
    };
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
   * Get a numeric property from an object
   * @param {Object} obj - The object to extract from
   * @param {string} key - Key to get
   * @returns {number} The extracted number value
   */
  getNumberProperty(obj, key) {
    if (!obj || !key) return 0;
    
    // Get the value, which could be a string or number
    const value = obj[key];
    
    // Parse to number if it's a string, or use as is if it's already a number
    if (typeof value === 'string') {
      return parseInt(value, 10) || 0;
    } else if (typeof value === 'number') {
      return value;
    }
    
    return 0;
  }
};