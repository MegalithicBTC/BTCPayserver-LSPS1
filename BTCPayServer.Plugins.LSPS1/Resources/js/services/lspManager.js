// LSP Manager - Handles LSP info loading and processing
window.LspManager = {
  lspInfo: null,
  
  init() {
    console.log("Initializing LSP Manager");
    // Try to load LSP info from data attribute or localStorage
    this.lspInfo = this.loadLspInfo();
  },
  
  loadLspInfo() {
    try {
      // First try to get from the hidden input
      const lspInfoElement = document.getElementById('lsp-info-data');
      if (lspInfoElement && lspInfoElement.value) {
        const parsedInfo = JSON.parse(lspInfoElement.value);
        
        // Save to localStorage for future page loads
        if (parsedInfo && Object.keys(parsedInfo).length > 0) {
          localStorage.setItem('lsps1_lsp_info', JSON.stringify(parsedInfo));
        }
        
        return parsedInfo;
      }
      
      // Fallback to localStorage
      const cachedInfo = localStorage.getItem('lsps1_lsp_info');
      if (cachedInfo) {
        return JSON.parse(cachedInfo);
      }
    } catch (error) {
      console.error("Error loading LSP info:", error);
    }
    
    return {};
  },
  
  // Process channel options
  processChannelOptions(lspInfo) {
    if (!lspInfo || !lspInfo.options) return null;
    
    const options = lspInfo.options;
    
    // Calculate min, max, and default values
    const minSats = options.minimal_channel_size || 100000;
    const maxSats = options.maximal_channel_size || 10000000;
    const defaultSats = Math.min(Math.max(1000000, minSats), maxSats);
    
    return {
      minSats,
      maxSats,
      defaultSats,
      minFeeSats: options.minimal_channel_fee || 0,
      maxFeeSats: options.maximal_channel_fee || 0,
      feeRate: options.channel_fee_rate || 0,
      requiresConfirmations: !!options.requires_confirmations
    };
  }
};