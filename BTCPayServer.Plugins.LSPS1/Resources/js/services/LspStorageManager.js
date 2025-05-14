// LspStorageManager - Handles storage of LSP info in localStorage
window.LspStorageManager = {
  // Key constants
  LSP_INFO_KEY: 'lsps1_lsp_info',
  LSP_PUBKEYS_KEY: 'lsps1_lsp_pubkeys',
  
  /**
   * Save LSP information to localStorage
   * @param {Object} lspInfo - LSP information to store
   */
  storeLspInfo(lspInfo) {
    if (!lspInfo) return;
    
    try {
      localStorage.setItem(this.LSP_INFO_KEY, JSON.stringify(lspInfo));
      console.log("LSP info saved to localStorage");
      
      // Also store in hidden input if it exists
      const lspInfoElement = document.getElementById('lsp-info-data');
      if (lspInfoElement) {
        lspInfoElement.value = JSON.stringify(lspInfo);
      }
      
      // Process the LSP info to extract and store public keys
      this.processLspInfo(lspInfo);
      
      return true;
    } catch (error) {
      console.error("Error saving LSP info to localStorage:", error);
      return false;
    }
  },
  
  /**
   * Load LSP information from localStorage or DOM
   * @returns {Object|null} The stored LSP info or null
   */
  loadLspInfo() {
    try {
      // First try to get from the hidden input
      const lspInfoElement = document.getElementById('lsp-info-data');
      if (lspInfoElement && lspInfoElement.value) {
        const parsedInfo = JSON.parse(lspInfoElement.value);
        
        // Save to localStorage for future page loads
        if (parsedInfo && Object.keys(parsedInfo).length > 0) {
          localStorage.setItem(this.LSP_INFO_KEY, JSON.stringify(parsedInfo));
        }
        
        console.log("LSP info loaded from DOM element");
        return parsedInfo;
      }
      
      // Fallback to localStorage
      const storedInfo = localStorage.getItem(this.LSP_INFO_KEY);
      if (storedInfo) {
        const parsedInfo = JSON.parse(storedInfo);
        console.log("LSP info loaded from localStorage");
        return parsedInfo;
      }
    } catch (error) {
      console.error("Error loading LSP info:", error);
    }
    return null;
  },
  
  /**
   * Clear LSP information from localStorage and DOM
   */
  clearLspInfo() {
    try {
      localStorage.removeItem(this.LSP_INFO_KEY);
      console.log("LSP info cleared from localStorage");
      
      // Also clear from hidden input if it exists
      const lspInfoElement = document.getElementById('lsp-info-data');
      if (lspInfoElement) {
        lspInfoElement.value = '';
      }
      
      // Note: We don't clear the pubkeys list as that's used for historical channel reference
    } catch (error) {
      console.error("Error clearing LSP info from localStorage:", error);
    }
  },
  
  /**
   * Store a list of LSP public keys extracted from URIs
   * @param {Array} uris - Array of LSP URI strings
   */
  storeLspPubKeysFromUris(uris) {
    if (!uris || !Array.isArray(uris) || uris.length === 0) {
      console.warn("No valid URIs provided to store LSP public keys");
      return;
    }
    
    // Extract public keys from URIs (format: pubkey@host:port)
    const pubKeys = uris.map(uri => {
      try {
        // Split the URI on @ and take the first part (the pubkey)
        const parts = uri.split('@');
        if (parts.length > 0) {
          return parts[0];
        }
        return null;
      } catch (e) {
        console.error("Error extracting pubkey from URI:", e);
        return null;
      }
    }).filter(key => key !== null);
    
    if (pubKeys.length === 0) {
      console.warn("No valid public keys extracted from URIs");
      return;
    }
    
    // Get existing keys
    const existingKeys = this.getLspPubKeys();
    
    // Merge existing keys with new ones (remove duplicates)
    const mergedKeys = [...new Set([...existingKeys, ...pubKeys])];
    
    // Store the updated list
    this.setLspPubKeys(mergedKeys);
    
    console.log(`Stored ${pubKeys.length} LSP public key(s) in localStorage`);
  },
  
  /**
   * Store LSP public keys directly
   * @param {Array} pubKeys - Array of public key strings
   */
  setLspPubKeys(pubKeys) {
    if (!pubKeys || !Array.isArray(pubKeys)) {
      console.error("Invalid public keys provided");
      return;
    }
    
    try {
      localStorage.setItem(this.LSP_PUBKEYS_KEY, JSON.stringify(pubKeys));
    } catch (error) {
      console.error("Error storing LSP public keys in localStorage:", error);
    }
  },
  
  /**
   * Get stored LSP public keys
   * @returns {Array} - Array of public key strings
   */
  getLspPubKeys() {
    try {
      const storedKeys = localStorage.getItem(this.LSP_PUBKEYS_KEY);
      return storedKeys ? JSON.parse(storedKeys) : [];
    } catch (error) {
      console.error("Error retrieving LSP public keys from localStorage:", error);
      return [];
    }
  },
  
  /**
   * Process get_info response to extract and store LSP public keys
   * @param {Object} lspInfo - The LSPS1GetInfoResponse object
   */
  processLspInfo(lspInfo) {
    if (!lspInfo) {
      console.warn("No LSP info provided");
      return;
    }
    
    // Extract and store nodeId if available
    if (lspInfo.nodeId) {
      const pubKeys = this.getLspPubKeys();
      if (!pubKeys.includes(lspInfo.nodeId)) {
        pubKeys.push(lspInfo.nodeId);
        this.setLspPubKeys(pubKeys);
        console.log("LSP public key added to pubkey list");
      }
    }
    
    // Extract and store public keys from URIs if available
    if (lspInfo.uris && Array.isArray(lspInfo.uris) && lspInfo.uris.length > 0) {
      this.storeLspPubKeysFromUris(lspInfo.uris);
    } else {
      console.warn("No URIs found in LSP info");
    }
  },
  
  /**
   * Clear all stored LSP public keys
   */
  clearLspPubKeys() {
    try {
      localStorage.removeItem(this.LSP_PUBKEYS_KEY);
      console.log("Cleared all stored LSP public keys");
    } catch (error) {
      console.error("Error clearing LSP public keys from localStorage:", error);
    }
  }
};