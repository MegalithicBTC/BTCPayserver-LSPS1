// ConnectionFooter component - Shows connection status
window.ConnectionFooter = function(footerProps) {
  const { userNodeIsConnectedToLsp, connectedLspName } = footerProps;
  
  return React.createElement('div', { className: 'connection-footer mt-4' },
    React.createElement('div', { className: userNodeIsConnectedToLsp ? 'alert alert-success' : 'alert alert-warning' },
      userNodeIsConnectedToLsp 
        ? `Connected to ${connectedLspName}`
        : 'Not connected to any Lightning Service Provider'
    )
  );
};