// ConnectionFooter component - Shows connection status and LSP selection
window.ConnectionFooter = function(footerProps) {
  const { userNodeIsConnectedToLsp, connectedLspName, availableLsps, storeId } = footerProps;
  
  // Create dropdown items if there are multiple LSPs
  let lspSelection = null;
  if (availableLsps && availableLsps.length > 1) {
    lspSelection = React.createElement('div', { className: 'mt-3' },
      React.createElement('p', null, 'Select Lightning Service Provider:'),
      React.createElement('select', { 
        className: 'form-select', 
        onChange: (e) => {
          window.location.href = `/stores/${storeId}/plugins/lsps1?selectedLsp=${e.target.value}`;
        }
      }, 
        availableLsps.map(lsp => 
          React.createElement('option', { 
            key: lsp.slug, 
            value: lsp.slug,
            selected: lsp.selected
          }, lsp.name)
        )
      )
    );
  }
  
  return React.createElement('div', { className: 'connection-footer mt-4' },
    React.createElement('div', { className: userNodeIsConnectedToLsp ? 'alert alert-success' : 'alert alert-warning' },
      userNodeIsConnectedToLsp 
        ? `Connected to ${connectedLspName}`
        : 'Not connected to any Lightning Service Provider'
    ),
    lspSelection
  );
};