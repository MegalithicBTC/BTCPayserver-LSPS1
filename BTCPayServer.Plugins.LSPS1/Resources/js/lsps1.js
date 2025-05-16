// Main initialization script for LSPS1 plugin

document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById('lsps1-root');

  if (rootElement) {
    try {
      // Initialize managers and services in the correct order
      // First initialize LspManager which doesn't depend on other services
      window.LspManager.init();
      
      // Get the data from the consolidated JSON block
      const dataElement = document.getElementById('lsps1-data');
      let props = {};
      
      if (dataElement) {
        try {
          // Parse the JSON data
          props = JSON.parse(dataElement.textContent);
          console.log("Parsed LSPS1 data:", props);
          
          // Note: We don't initialize LspApiService here since the LSP URL will be set
          // when the user clicks the "Connect to LSP" button
          
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