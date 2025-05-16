// LSPS1App - Main application component without channel management functionality
window.LSPS1App = function(props) {
  const [loading, setLoading] = React.useState(false);
  const [userNodeIsConnectedToLsp, setUserNodeIsConnectedToLsp] = React.useState(props.userNodeIsConnectedToLsp);
  const [userNodeFailedToConnectToLsp, setUserNodeFailedToConnectToLsp] = React.useState(props.userNodeFailedToConnectToLsp);
  const [connectionMessage, setConnectionMessage] = React.useState("Your Lightning node is online.");
  const [connectedLspName, setConnectedLspName] = React.useState(props.connectedLspName);
  const [lspInfo, setLspInfo] = React.useState(props.lspInfo || {});
  const [fetchingLspInfo, setFetchingLspInfo] = React.useState(false);
  const [lspErrorMessage, setLspErrorMessage] = React.useState("");
  // Add selected LSP state
  const [selectedLspSlug, setSelectedLspSlug] = React.useState(props.selectedLspSlug || 'megalith-lsp');
  // Add channel size state
  const [channelSize, setChannelSize] = React.useState(1000000); // Default 1M sats
  const [orderResult, setOrderResult] = React.useState(null);
  const [lspUrl, setLspUrl] = React.useState(props.lspUrl || "");
  
  // Helper function to process LSP info and extract public keys
  const processLspInfo = (lspInfo) => {
    if (!lspInfo || !lspInfo.uris || !Array.isArray(lspInfo.uris) || lspInfo.uris.length === 0) {
      console.warn("No valid URIs in LSP info");
      return;
    }
    
    // Just extract and log the public keys, no storage
    const pubKeys = lspInfo.uris.map(uri => {
      const parts = uri.split('@');
      return parts.length > 0 ? parts[0] : null;
    }).filter(key => key !== null);
    
    console.log("LSP public keys from URIs:", pubKeys);
  };

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
        setConnectedLspName(props.availableLsps.find(l => l.slug === selectedLspSlug)?.name || "LSP");
        setConnectionMessage(`Connected to ${props.availableLsps.find(l => l.slug === selectedLspSlug)?.name || "LSP"}`);
        
        // Process LSP info to extract public keys (no storage)
        processLspInfo(data.lspInfo);
        
        // Make sure we have the lspUrl
        if (!data.lspUrl) {
          console.error("LSP URL is missing in response");
          setLspErrorMessage("LSP URL is missing. Please try again.");
          return false;
        }
        
        // Save the LSP URL for the channel configuration
        setLspUrl(data.lspUrl);
        
        // Initialize API service with LSP URL
        if (window.LspApiService) {
          if (typeof window.LspApiService.init === 'function') {
            window.LspApiService.init(data.lspUrl);
            console.log("LspApiService initialized with URL:", data.lspUrl);
          } else {
            console.error("LspApiService.init method is not available");
          }
        } else {
          console.error("LspApiService is not available");
        }
        
        // Update LSP info in LspManager (no storage)
        if (window.LspManager) {
          if (typeof window.LspManager.updateLspInfo === 'function') {
            window.LspManager.updateLspInfo(data.lspInfo);
            console.log("LSP info updated in LspManager");
          } else {
            console.error("LspManager.updateLspInfo method is not available");
          }
        } else {
          console.error("LspManager is not available");
        }
        
        setLoading(false);
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
        
        // Moved renderLspSelectionDropdown() to be after the connect button
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
      renderContent(),
    
   
  );
};