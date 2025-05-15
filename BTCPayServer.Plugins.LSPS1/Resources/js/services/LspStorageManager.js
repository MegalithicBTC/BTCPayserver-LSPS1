// LspStorageManager - Mock implementation that doesn't use localStorage
window.LspStorageManager = {
  // Key constants kept for interface compatibility
  LSP_INFO_KEY: 'lsps1_lsp_info',
  LSP_PUBKEYS_KEY: 'lsps1_lsp_pubkeys',
  
  /**
   * Mock save LSP information (doesn't actually store anything)
   * @param {Object} lspInfo - LSP information
   */
  storeLspInfo(lspInfo) {
    if (!lspInfo) return false;
    console.log("LSP info received (no storage)");
    
    // Also store in hidden input if it exists (for current page only)
    const lspInfoElement = document.getElementById('lsp-info-data');
    if (lspInfoElement) {
      lspInfoElement.value = JSON.stringify(lspInfo);
    }
    
    return true;
  },
  
  /**
   * Mock load LSP information
   * @returns {Object|null} The LSP info from DOM or null
   */
  loadLspInfo() {
    // Only try to get from the hidden input (current page only, no persistence)
    const lspInfoElement = document.getElementById('lsp-info-data');
    if (lspInfoElement && lspInfoElement.value) {
      try {
        const parsedInfo = JSON.parse(lspInfoElement.value);
        console.log("LSP info loaded from DOM element (no storage)");
        return parsedInfo;
      } catch (error) {
        console.error("Error parsing LSP info from DOM:", error);
      }
    }
    
    return null;
  },
  
  /**
   * Mock clear LSP information (just clears DOM element)
   */
  clearLspInfo() {
    const lspInfoElement = document.getElementById('lsp-info-data');
    if (lspInfoElement) {
      lspInfoElement.value = '';
    }
    console.log("LSP info cleared (no storage used)");
  },
  
  /**
   * Mock store LSP public keys from URIs (doesn't store anything)
   * @param {Array} uris - Array of LSP URI strings
   */
  storeLspPubKeysFromUris(uris) {
    if (!uris || !Array.isArray(uris) || uris.length === 0) {
      console.warn("No valid URIs provided");
      return;
    }
    
    // Just log the public keys without storing them
    const pubKeys = uris.map(uri => {
      const parts = uri.split('@');
      return parts.length > 0 ? parts[0] : null;
    }).filter(key => key !== null);
    
    console.log(`Extracted ${pubKeys.length} LSP public key(s) (no storage)`);
  },
  
  /**
   * Mock store LSP public keys (doesn't store anything)
   * @param {Array} pubKeys - Array of public key strings
   */
  setLspPubKeys(pubKeys) {
    console.log(`Received ${pubKeys?.length || 0} public keys (no storage)`);
  },
  
  /**
   * Mock get stored LSP public keys
   * @returns {Array} - Empty array since we don't store anything
   */
  getLspPubKeys() {
    return [];
  },
  
  /**
   * Mock process LSP info (doesn't store anything)
   * @param {Object} lspInfo - The LSPS1GetInfoResponse object
   */
  processLspInfo(lspInfo) {
    if (!lspInfo) {
      console.warn("No LSP info provided");
      return;
    }
    
    if (lspInfo.uris && Array.isArray(lspInfo.uris) && lspInfo.uris.length > 0) {
      console.log(`Processed ${lspInfo.uris.length} LSP URIs (no storage)`);
    }
  },
  
  /**
   * Mock clear all stored LSP public keys (does nothing)
   */
  clearLspPubKeys() {
    console.log("Public keys cleared (no storage used)");
  }
};