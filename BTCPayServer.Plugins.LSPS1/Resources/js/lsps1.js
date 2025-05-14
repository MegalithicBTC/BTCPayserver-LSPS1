// Main initialization script for LSPS1 plugin

// Initialize a global flag to track initialization state
window.lsps1InitComplete = false;

document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById('lsps1-root');

  if (rootElement) {
    try {
      // Initialize managers and services in the correct order
      // First initialize LspManager which doesn't depend on other services
      if (window.LspManager) {
        window.LspManager.init();
      } else {
        console.error("LspManager is not available");
      }
      
      // Get the data from the consolidated JSON block
      const dataElement = document.getElementById('lsps1-data');
      let props = {};
      
      if (dataElement) {
        try {
          // Parse the JSON data
          props = JSON.parse(dataElement.textContent);
          console.log("Parsed LSPS1 data:", props);
          
          // Initialize LspApiService if lspUrl is available
          if (props.lspUrl && typeof window.LspApiService !== 'undefined') {
            window.LspApiService.init(props.lspUrl);
            console.log("LspApiService initialized with URL:", props.lspUrl);
          } else {
            // Only log as debug instead of warning for initial load
            console.debug("LspApiService not initialized: URL will be set when user selects an LSP");
          }
          
          // Get the LSP info
          if (props.initialLspInfoJson && props.initialLspInfoJson !== 'null') {
            const lspInfo = typeof props.initialLspInfoJson === 'string' 
              ? JSON.parse(props.initialLspInfoJson) 
              : props.initialLspInfoJson;
              
            if (lspInfo && Object.keys(lspInfo).length > 0) {
              // Initialize ChannelOrderManager if all dependencies are available
              if (typeof window.ChannelOrderManager !== 'undefined' && 
                  typeof window.LspApiService !== 'undefined') {
                window.ChannelOrderManager.init(
                  lspInfo,
                  props.lspUrl || '',
                  props.nodePublicKey || ''
                );
                console.log("ChannelOrderManager initialized");
              } else {
                console.debug("ChannelOrderManager will initialize after user selects an LSP");
              }
            }
          }
        } catch (parseError) {
          console.error("Error parsing LSPS1 data:", parseError);
        }
      }
      
      // Add the CSRF token which we still need to get separately for security reasons
      const xsrfElement = document.getElementById('request-verification-token');
      if (xsrfElement) {
        props.xsrfToken = xsrfElement.dataset.token || '';
      }
      
      // Render the app using React 18's createRoot API
      const root = ReactDOM.createRoot(rootElement);
      root.render(React.createElement(window.LSPS1App, props));
      
      // Mark initialization as complete
      window.lsps1InitComplete = true;
      console.log("LSPS1 app initialized successfully");
    } catch (error) {
      console.error("Error initializing LSPS1 application:", error);
      rootElement.innerHTML = `
        <div class="alert alert-danger">
          <strong>Error loading Lightning Channel interface</strong>
          <p>Please check the console for more information.</p>
        </div>
      `;
    }
  }
});