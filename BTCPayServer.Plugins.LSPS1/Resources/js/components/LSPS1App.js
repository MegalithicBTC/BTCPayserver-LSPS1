// LSPS1App - Main application component without channel management functionality
window.LSPS1App = function(props) {
  const [loading, setLoading] = React.useState(false);
  const [userNodeIsConnectedToLsp, setUserNodeIsConnectedToLsp] = React.useState(props.userNodeIsConnectedToLsp);
  const [userNodeFailedToConnectToLsp, setUserNodeFailedToConnectToLsp] = React.useState(props.userNodeFailedToConnectToLsp);
  const [lspInfo, setLspInfo] = React.useState(props.lspInfo || {});
  const [fetchingLspInfo, setFetchingLspInfo] = React.useState(false);
  const [lspErrorMessage, setLspErrorMessage] = React.useState("");
  const [selectedLspSlug, setSelectedLspSlug] = React.useState(props.selectedLspSlug || 'megalith-lsp');
  const [channelSize, setChannelSize] = React.useState(1000000); // Default 1M sats
  const [orderResult, setOrderResult] = React.useState(null);
  const [lspUrl, setLspUrl] = React.useState(props.lspUrl || "");

  // Function to get LSP info and connect to the LSP
  const getLspInfo = async () => {
    try {
      setFetchingLspInfo(true);
      setLspErrorMessage("");
      
      console.log(`Getting LSP info for ${selectedLspSlug}`);
      const response = await fetch(`/stores/${props.storeId}/plugins/lsps1/get-lsp-info?lspSlug=${selectedLspSlug}`);
      const data = await response.json();
      
      if (data.success && data.lspInfo) {
        console.log("Successfully retrieved LSP info:", data.lspInfo);
        setLspInfo(data.lspInfo);
        setUserNodeIsConnectedToLsp(true);
        setUserNodeFailedToConnectToLsp(false);
        
        // Make sure we have the lspUrl
        if (!data.lspUrl) {
          console.error("LSP URL is missing in response");
          setLspErrorMessage("LSP URL is missing. Please try again.");
          return false;
        }
        
        // Save the LSP URL for the channel configuration
        setLspUrl(data.lspUrl);
        
        // Initialize API service with LSP URL
        window.LspApiService.init(data.lspUrl);
        console.log("LspApiService initialized with URL:", data.lspUrl);
        
        // Update LSP info in LspManager
        window.LspManager.updateLspInfo(data.lspInfo);
        console.log("LSP info updated in LspManager");
        
        return true;
      } else {
        console.error("Failed to get LSP info:", data.error);
        setUserNodeIsConnectedToLsp(false);
        setUserNodeFailedToConnectToLsp(true);
        setLspErrorMessage(data.error || "LSP failure, please try a different LSP.");
        return false;
      }
    } catch (error) {
      console.error("Error getting LSP info:", error);
      setUserNodeIsConnectedToLsp(false);
      setUserNodeFailedToConnectToLsp(true);
      setLspErrorMessage("Error connecting to LSP. Please try again.");
      return false;
    } finally {
      setFetchingLspInfo(false);
      setLoading(false);
    }
  };

  // For the "Connect to LSP" button
  const connectToLsp = () => {
    setLoading(true);
    getLspInfo();
  };

  // Render LSP selection dropdown
  const renderLspSelectionDropdown = () => {
    if (!props.availableLsps || props.availableLsps.length <= 1) {
      return null;
    }
    
    return React.createElement('div', { className: 'mt-2 text-center' },
      React.createElement('button', { 
        className: 'd-inline-flex align-items-center btn btn-link fs-6 text-muted p-0', 
        type: 'button',
        'data-bs-toggle': 'collapse', 
        'data-bs-target': '#lspSelectorContent', 
        'aria-expanded': 'false', 
        'aria-controls': 'lspSelectorContent'
      }, 
        React.createElement('span', { className: 'me-1' }, 'Choose Provider'),
        React.createElement('vc:icon', { symbol: 'caret-down' })
      ),
      React.createElement('div', { 
        className: 'collapse mt-2', 
        id: 'lspSelectorContent',
        style: { 
          maxWidth: '240px',
          margin: '0 auto'
        }
      },
        React.createElement('div', { className: 'form-group' },
          React.createElement('select', { 
            id: 'lsp-selector',
            className: 'form-select', 
            value: selectedLspSlug,
            onChange: (e) => {
              setSelectedLspSlug(e.target.value);
            }
          }, 
            props.availableLsps.map(lsp => 
              React.createElement('option', { 
                key: lsp.slug, 
                value: lsp.slug
              }, lsp.name)
            )
          )
        )
      )
    );
  };

  // Determine content based on lightning node availability
  const renderContent = () => {
    // If user has no lightning node connected, show setup instructions
    if (!props.userHasLightningNode) {
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'alert alert-warning' },
          "Could not get your node's public key, please check your Lightning configuration"),
        React.createElement(window.LightningNodeSetup, {
          storeId: props.storeId,
          lightningSetupUrl: `/stores/${props.storeId}/lightning/BTC/setup`
        })
      );
    }
    
    // If user's node is not connected to LSP, show connection button and dropdown
    if (!userNodeIsConnectedToLsp) {
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'text-center mb-4' },
          React.createElement('button', {
            className: 'btn btn-primary btn-lg',
            onClick: connectToLsp,
            disabled: fetchingLspInfo
          }, fetchingLspInfo ? 'Connecting...' : `Connect to Lightning Service Provider`),
          
          lspErrorMessage && React.createElement('div', {
            className: 'alert alert-danger mt-3'
          }, lspErrorMessage)
        ),
        
        renderLspSelectionDropdown()
      );
    }
    
    // If connected to LSP, show channel configuration or order result
    return React.createElement(React.Fragment, null,
      // Only show channel configuration if we don't have an order result yet
      !orderResult && React.createElement(window.ChannelConfiguration, {
        channelSize: channelSize,
        setChannelSize: setChannelSize,
        lspInfo: lspInfo,
        lspUrl: lspUrl,
        nodePublicKey: props.nodePublicKey,
        setOrderResult: setOrderResult
      }),
      
      // Show order result if we have one
      orderResult && React.createElement(window.OrderResult, {
        orderResult: orderResult,
        channelSize: channelSize
      })
    );
  };
  
  return React.createElement('div', { className: 'lsps1-container' },
    loading ? 
      React.createElement(window.LoadingSpinner) : 
      renderContent()
  );
};