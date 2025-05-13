// Main initialization script for LSPS1 plugin
document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById('lsps1-root');

  if (rootElement) {
    try {
      // Initialize managers
      window.LspManager.init();
      
      // Get the LSP info
      const lspInfo = window.LspManager.loadLspInfo();
      if (lspInfo && Object.keys(lspInfo).length > 0) {
        window.ChannelOrderManager.init(lspInfo);
      }
      
      // Gather data from hidden inputs
      const props = {
        storeId: document.getElementById('store-id')?.value || '',
        xsrfToken: document.getElementById('request-verification-token')?.value || '',
        initialConnectionStatus: document.getElementById('is-connected')?.value || 'false',
        initialConnectionMessage: document.getElementById('connection-message')?.value || '',
        initialSelectedLspSlug: document.getElementById('selected-lsp-slug')?.value || '',
        initialConnectedLspName: document.getElementById('connected-lsp-name')?.value || '',
        initialLspInfoJson: document.getElementById('lsp-info-data')?.value || '{}',
        nodePublicKey: document.getElementById('node-public-key-value')?.textContent.trim() || '',
        availableLsps: Array.from(document.querySelectorAll('#available-lsps [data-lsp-slug]')).map(el => ({
          slug: el.dataset.lspSlug,
          name: el.dataset.lspName,
          selected: el.dataset.lspSelected === 'true'
        }))
      };

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