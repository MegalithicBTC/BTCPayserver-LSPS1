// LSP Manager - Centralized manager for LSP connections and configuration
window.LspManager = {
  lspInfo: null,
  lspOptions: null,
  selectedLsp: null,
  
  // Single updateLspInfo method that handles all the option configuration
  updateLspInfo(lspInfo) {
    if (!lspInfo) return false;
    
    this.lspInfo = lspInfo;
    
    // Initialize options object
    this.lspOptions = window.LspConfigManager ? 
      window.LspConfigManager.processChannelOptions(lspInfo) : {};
    
    // Ensure we have a valid options object
    if (!this.lspOptions) this.lspOptions = {};
    
    // Parse string values to integers for balance fields
    const minLspBalance = parseInt(lspInfo.min_initial_lsp_balance_sat, 10) || 150000;
    const maxLspBalance = parseInt(lspInfo.max_initial_lsp_balance_sat, 10) || 16777215;
    
    // Only set these if they're not already set by the LspConfigManager
    if (!this.lspOptions.minSats) this.lspOptions.minSats = minLspBalance;
    if (!this.lspOptions.maxSats) this.lspOptions.maxSats = maxLspBalance;
    if (!this.lspOptions.minChannelSize) this.lspOptions.minChannelSize = minLspBalance;
    if (!this.lspOptions.maxChannelSize) this.lspOptions.maxChannelSize = maxLspBalance;
    
    // Set a reasonable default channel size (1M sats), constrained by min/max bounds
    if (!this.lspOptions.defaultChannelSize) {
      const defaultSize = 1000000; // 1M sats
      this.lspOptions.defaultChannelSize = Math.min(
        Math.max(defaultSize, minLspBalance), 
        maxLspBalance
      );
    }
    
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