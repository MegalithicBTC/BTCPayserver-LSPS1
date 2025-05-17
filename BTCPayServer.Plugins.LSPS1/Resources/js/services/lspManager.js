// LSP Manager - Centralized manager for LSP connections and configuration
window.LspManager = {
  lspInfo: null,
  lspOptions: null,
  selectedLsp: null,
  
  // Update LSP information and process channel options
  updateLspInfo(lspInfo) {
    if (!lspInfo) return false;
    
    this.lspInfo = lspInfo;
    
    // Process options internally
    this.lspOptions = this.processChannelOptions(lspInfo);
    
    // If processChannelOptions returns null, there's an issue with the LSP data
    if (!this.lspOptions) {
      console.error("Failed to process LSP channel options - invalid data received from LSP");
      return false;
    }
    
    return true;
  },
  
  // Get stored LSP options
  getLspOptions() {
    return this.lspOptions;
  },
  
  // Get stored LSP info
  getLspInfo() {
    return this.lspInfo;
  },
  
  // Set selected LSP slug
  setSelectedLsp(lspSlug) {
    this.selectedLsp = lspSlug;
    return true;
  },
  
  // Get selected LSP slug
  getSelectedLsp() {
    return this.selectedLsp;
  },
  
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
    
  
    const minLspBalance = this.getNumberProperty(lspInfo, 'min_initial_lsp_balance_sat');
    const maxLspBalance = this.getNumberProperty(lspInfo, 'max_initial_lsp_balance_sat');
    
    // Use the appropriate min/max values
    const minChannelSize = minLspBalance
    const maxChannelSize = maxLspBalance;
    
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