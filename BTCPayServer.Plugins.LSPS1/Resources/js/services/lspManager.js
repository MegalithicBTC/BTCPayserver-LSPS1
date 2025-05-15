// LSP Manager - Centralized manager for LSP connections and configuration
window.LspManager = {
  lspInfo: null,
  lspOptions: null,
  selectedLsp: null,
  
  init() {
    console.log("Initializing LSP Manager");
    
    // Simple initialization without storage dependency
    return true;
  },
  
  processOptions() {
    if (!this.lspInfo) return null;
    
    // Process options using LspConfigManager if available
    if (window.LspConfigManager && typeof window.LspConfigManager.processChannelOptions === 'function') {
      this.lspOptions = window.LspConfigManager.processChannelOptions(this.lspInfo);
      
      // Log updated options
      console.log("LSP info updated:", this.lspInfo);
      console.log("LSP options updated:", this.lspOptions);
      
      // If no options were returned, create basic values
      if (!this.lspOptions) {
        this.createBasicOptions();
      }
    } else {
      this.createBasicOptions();
    }
    
    // Ensure critical values exist with fallbacks
    if (!this.lspOptions) this.lspOptions = {};
    
    // Handle snake_case and camelCase property names in LSPS1 responses
    const getVal = (obj, props, defaultVal) => {
      for (const prop of props) {
        if (obj[prop] !== undefined && obj[prop] !== null) {
          // Convert string number to actual number
          return typeof obj[prop] === 'string' ? parseInt(obj[prop], 10) : obj[prop];
        }
      }
      return defaultVal;
    };
    
    // Create proper options for the channel slider with LSP balance values
    // Megalith LSP sends client balance as 0, but sets LSP balance values
    const minLspBalance = getVal(this.lspInfo, 
      ['min_initial_lsp_balance_sat', 'minInitialLspBalanceSat'], 150000);
    const maxLspBalance = getVal(this.lspInfo, 
      ['max_initial_lsp_balance_sat', 'maxInitialLspBalanceSat'], 16000000);
        
    if (!this.lspOptions.minSats || this.lspOptions.minSats === 0) {
      this.lspOptions.minSats = minLspBalance;
    }
    
    if (!this.lspOptions.maxSats || this.lspOptions.maxSats === 0) {
      this.lspOptions.maxSats = maxLspBalance;
    }
    
    if (!this.lspOptions.minChannelSize || this.lspOptions.minChannelSize === 0) {
      this.lspOptions.minChannelSize = minLspBalance;
    }
    
    if (!this.lspOptions.maxChannelSize || this.lspOptions.maxChannelSize === 0) {
      this.lspOptions.maxChannelSize = maxLspBalance;
    }
    
    if (!this.lspOptions.defaultChannelSize || this.lspOptions.defaultChannelSize === 0) {
      // Set a sensible default value between min and max (about 1/3 of the range)
      const range = this.lspOptions.maxSats - this.lspOptions.minSats;
      this.lspOptions.defaultChannelSize = this.lspOptions.minSats + Math.round(range / 3);
      // Ensure defaultChannelSize is at least 500k sats but not more than max
      this.lspOptions.defaultChannelSize = Math.max(
        Math.min(500000, this.lspOptions.maxSats),
        this.lspOptions.defaultChannelSize
      );
    }
    
    return this.lspOptions;
  },
  
  createBasicOptions() {
    // Set up basic options if manager is not available
    console.log("Creating basic channel options");
    this.lspOptions = {
      minSats: 150000,
      maxSats: 16000000,
      minChannelSize: 150000,
      maxChannelSize: 16000000,
      defaultChannelSize: 1000000,
      feeRatePercent: 0.1
    };
  },
  
  updateLspInfo(lspInfo) {
    if (!lspInfo) return false;
    
    this.lspInfo = lspInfo;
    this.processOptions();
    
    return true;
  },
  
  getLspOptions() {
    return this.lspOptions;
  },
  
  getLspInfo() {
    return this.lspInfo;
  },
  
  setSelectedLsp(lspSlug) {
    this.selectedLsp = lspSlug;
    return true;
  },
  
  getSelectedLsp() {
    return this.selectedLsp;
  }
};