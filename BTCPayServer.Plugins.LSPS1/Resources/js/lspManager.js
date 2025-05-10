/**
 * LSP Manager - Core functionality for LSP selection and connection
 */
const LspManager = {
    /**
     * Initialize the LSP Manager
     */
    init: function() {
      console.log("LSP Manager initialized");
      
      // Set up event listeners for the LSP dropdown items
      this.setupLspSelectionHandlers();
      
      // Load and log LSPS1GetInfoResponse data if available
      this.loadLspInfo();
    },
    
    /**
     * Load LSP info from the page
     */
    loadLspInfo: function() {
      try {
        const lspInfoElement = document.getElementById('lsp-info-data');
        if (lspInfoElement) {
          const lspInfoText = lspInfoElement.value;
          if (lspInfoText && lspInfoText !== "null") {
            const lspInfo = JSON.parse(lspInfoText);
            console.log("LSPS1GetInfoResponse data:", lspInfo);
            return lspInfo;
          } else {
            console.log("LSP info data is null or empty");
          }
        } else {
          console.log("No LSP info element found");
        }
      } catch (err) {
        console.error("Error parsing LSP info data:", err);
      }
      return null;
    },
    
    /**
     * Attaches click handlers to all LSP selection options
     */
    setupLspSelectionHandlers: function() {
      // Find all LSP selection links in the dropdown
      const items = document.querySelectorAll('.dropdown-item[data-lsp-slug]');
      console.log("Found LSP dropdown items:", items.length);
      
      const self = this; // Store reference for use in event handler
      items.forEach(item => {
        // Add event listener to handle LSP selection
        item.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation(); // Stop event from bubbling up
          self.handleLspSelection(e);
        });
        console.log("Added click handler to:", item.textContent.trim());
      });
    },
    
    /**
     * Handles the LSP selection and connection process
     * @param {Event} e - The click event
     */
    handleLspSelection: function(e) {
      e.preventDefault();
      e.stopPropagation(); // Stop event from bubbling up
      
      // Get necessary data
      const lspSlug = e.currentTarget.dataset.lspSlug;
      const storeId = document.getElementById("store-id").value;
      
      console.log("Selecting LSP:", lspSlug);
      
      // Update the URL directly to include the selected LSP as a query parameter
      window.location.href = `/stores/${storeId}/plugins/lsps1?lsp=${lspSlug}`;
    }
  };
  
  // Export the manager using ES6 export
  export default LspManager;