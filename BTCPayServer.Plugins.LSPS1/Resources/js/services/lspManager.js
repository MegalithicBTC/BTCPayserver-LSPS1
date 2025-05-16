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

      this.lspOptions = window.LspConfigManager.processChannelOptions(this.lspInfo);
      
      // Log updated options
      console.log("LSP info updated:", this.lspInfo);
      console.log("LSP options updated:", this.lspOptions);

    
    // Ensure options object exists
    this.lspOptions = this.lspOptions || {};
    
    // Directly use the values from the LSP response
    if (this.lspInfo) {
      // Parse string values to integers for balance fields
      const minLspBalance = parseInt(this.lspInfo.min_initial_lsp_balance_sat, 10);
      const maxLspBalance = parseInt(this.lspInfo.max_initial_lsp_balance_sat, 10);
      
      // Set values from LSP info directly
      this.lspOptions.minSats = minLspBalance;
      this.lspOptions.maxSats = maxLspBalance;
      this.lspOptions.minChannelSize = minLspBalance;
      this.lspOptions.maxChannelSize = maxLspBalance;
      
      // Set default channel size to 1,000,000 satoshis
      this.lspOptions.defaultChannelSize = 1000000;
      
      // If default size is outside the allowed range, constrain it
      if (this.lspOptions.defaultChannelSize < minLspBalance) {
        this.lspOptions.defaultChannelSize = minLspBalance;
      } else if (this.lspOptions.defaultChannelSize > maxLspBalance) {
        this.lspOptions.defaultChannelSize = maxLspBalance;
      }
    }
    
    return this.lspOptions;
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