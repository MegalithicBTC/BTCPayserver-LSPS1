// LSP Manager - Handles core LSP functionality and integration
window.LspManager = {
  lspInfo: null,
  options: null,
  
  /**
   * Initialize the LSP Manager
   */
  init() {
    console.log("Initializing LSP Manager");
    // Try to load LSP info from data attribute or localStorage
    this.lspInfo = window.LspStorageManager.loadLspInfo();
    
    // Process channel options if LSP info is available
    if (this.lspInfo && Object.keys(this.lspInfo).length > 0) {
      this.options = window.LspConfigManager.processChannelOptions(this.lspInfo);
      console.log("LSP options processed:", this.options);
    } else {
      // Use debug level instead of warning for initial load
      console.debug("LSP options not available during initial load");
    }
  },
  
  /**
   * Update LSP information
   * @param {Object} lspInfo - New LSP information
   */
  updateLspInfo(lspInfo) {
    if (lspInfo && Object.keys(lspInfo).length > 0) {
      this.lspInfo = lspInfo;
      this.options = window.LspConfigManager.processChannelOptions(lspInfo);
      window.LspStorageManager.storeLspInfo(lspInfo);
      
      console.log("LSP info updated:", this.lspInfo);
      console.log("LSP options updated:", this.options);
      
      // Dispatch event for components to react
      document.dispatchEvent(new CustomEvent('lsp-info-updated', { 
        detail: { lspInfo: this.lspInfo, options: this.options } 
      }));
    }
  },
  
  /**
   * Store LSP information (alias for updateLspInfo)
   * @param {Object} lspInfo - New LSP information
   */
  storeLspInfo(lspInfo) {
    this.updateLspInfo(lspInfo);
  },
  
  /**
   * Reset/clear all LSP information
   */
  clearLspInfo() {
    this.lspInfo = {};
    this.options = null;
    window.LspStorageManager.clearLspInfo();
    
    // Dispatch event for components to react
    document.dispatchEvent(new CustomEvent('lsp-info-cleared'));
  },
  
  /**
   * Get LSP channel options
   * @returns {Object|null} The processed channel options or null
   */
  getChannelOptions() {
    if (!this.options && this.lspInfo) {
      this.options = window.LspConfigManager.processChannelOptions(this.lspInfo);
    }
    return this.options;
  },
  
  /**
   * Check if a channel size is valid
   * @param {number} channelSize - Size in satoshis
   * @returns {boolean} Whether size is valid
   */
  isValidChannelSize(channelSize) {
    const options = this.getChannelOptions();
    return window.LspConfigManager.validateChannelSize(channelSize, options);
  },
  
  /**
   * Calculate fee for a channel size
   * @param {number} channelSize - Size in satoshis
   * @returns {number} Fee in satoshis
   */
  calculateChannelFee(channelSize) {
    const options = this.getChannelOptions();
    return window.LspConfigManager.calculateFee(channelSize, options);
  }
};