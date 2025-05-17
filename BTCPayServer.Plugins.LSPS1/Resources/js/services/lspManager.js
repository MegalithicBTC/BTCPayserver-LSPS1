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
  
  // Get first URI from LSP info for node connection
  getFirstUri() {
    return this.lspInfo && this.lspInfo.uris && this.lspInfo.uris.length > 0 
      ? this.lspInfo.uris[0] 
      : null;
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
   * Directly fetch LSP info from the LSP endpoint
   * @param {string} lspUrl - The URL of the LSP endpoint
   * @returns {Promise<Object>} LSP info from get_info endpoint
   */
  async fetchLspInfoDirectly(lspUrl) {
    if (!lspUrl) {
      console.error("No LSP URL provided");
      return { success: false, error: "No LSP URL provided" };
    }
    
    try {
      // Make sure URL ends with a slash
      if (!lspUrl.endsWith('/')) {
        lspUrl += '/';
      }
      
      const url = `${lspUrl}get_info`;
      console.log(`Fetching LSP info directly from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const lspInfo = await response.json();
      console.log("Successfully retrieved LSP info directly:", lspInfo);
      
      // Save the info in the manager
      this.updateLspInfo(lspInfo);
      
      return { 
        success: true, 
        lspInfo: lspInfo 
      };
    } catch (error) {
      console.error("Error fetching LSP info directly:", error);
      return { 
        success: false, 
        error: error.message || "Failed to fetch LSP info" 
      };
    }
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
    
    // Use the larger value between min_channel_balance_sat and min_initial_lsp_balance_sat
    const minChannelSize = Math.max(
      parseInt(lspInfo.min_initial_lsp_balance_sat || '0', 10),
      parseInt(lspInfo.min_channel_balance_sat || '0', 10)
    );
    
    // Extract max channel size from max_initial_lsp_balance_sat
    const maxChannelSize = parseInt(lspInfo.max_initial_lsp_balance_sat || '0', 10);
    
    // Use 1M sats as default channel size, constrained by min/max
    const defaultChannelSize = Math.min(Math.max(1000000, minChannelSize), maxChannelSize);
    
    console.log("Channel option calculations:", {
      minChannelSize, 
      maxChannelSize, 
      defaultChannelSize
    });
    
    // Return only the three essential values
    return {
      minChannelSize: minChannelSize,
      maxChannelSize: maxChannelSize,
      defaultChannelSize: defaultChannelSize
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
  }
};