// LSPS1App - Main application component without channel management functionality
window.LSPS1App = function(props) {
  const [loading, setLoading] = React.useState(false);
  const [userNodeIsConnectedToLsp, setUserNodeIsConnectedToLsp] = React.useState(props.userNodeIsConnectedToLsp);
  const [userNodeFailedToConnectToLsp, setUserNodeFailedToConnectToLsp] = React.useState(props.userNodeFailedToConnectToLsp);
  const [lspInfo, setLspInfo] = React.useState(props.lspInfo || {});
  const [fetchingLspInfo, setFetchingLspInfo] = React.useState(false);
  const [lspErrorMessage, setLspErrorMessage] = React.useState("");
  const [selectedLspSlug, setSelectedLspSlug] = React.useState(props.selectedLspSlug);
  const [channelSize, setChannelSize] = React.useState(1000000); // Default 1M sats
  const [orderResult, setOrderResult] = React.useState(null);
  const [lspUrl, setLspUrl] = React.useState(props.lspUrl || "");

  // Get LSP URL from available LSPs based on selected slug
  const getLspUrlFromSlug = (slug) => {
    const lsp = props.availableLsps?.find(lsp => lsp.slug === slug);
    return lsp?.url || "";
  };

  // Function to directly get LSP info from the LSP endpoint
  const getLspInfoDirectly = async () => {
    try {
      setFetchingLspInfo(true);
      setLspErrorMessage("");
      
      // Get URL for the selected LSP
      const lspUrl = getLspUrlFromSlug(selectedLspSlug);
      if (!lspUrl) {
        throw new Error(`No URL found for LSP: ${selectedLspSlug}`);
      }
      
      console.log(`Getting LSP info directly from ${selectedLspSlug} at ${lspUrl}`);
      
      // Use LspManager to fetch LSP info directly
      const result = await window.LspManager.fetchLspInfoDirectly(lspUrl);
      
      if (result.success && result.lspInfo) {
        console.log("Successfully retrieved LSP info:", result.lspInfo);
        
        // Store LSP info
        setLspInfo(result.lspInfo);
        setLspUrl(lspUrl);
        
        // Use the first URI from the LSP info to connect to the node
        const firstUri = window.LspManager.getFirstUri();
        if (!firstUri) {
          throw new Error("No URIs found in LSP info");
        }
        
        // Connect to the node via the C# endpoint
        const connectResult = await connectNodeViaBackend(firstUri, selectedLspSlug);
        
        if (connectResult.success) {
          // Successfully connected to node
          setUserNodeIsConnectedToLsp(true);
          setUserNodeFailedToConnectToLsp(false);
          
          // Initialize API service with LSP URL
          window.LspApiService.init(lspUrl);
          console.log("LspApiService initialized with URL:", lspUrl);
          
          return true;
        } else {
          // Failed to connect to node
          throw new Error(connectResult.error || "Failed to connect to LSP node");
        }
      } else {
        // Failed to get LSP info
        throw new Error(result.error || "Failed to get info from the LSP");
      }
    } catch (error) {
      console.error("Error in LSP connection process:", error);
      setUserNodeIsConnectedToLsp(false);
      setUserNodeFailedToConnectToLsp(true);
      setLspErrorMessage(error.message || "Something went wrong when connecting to the LSP. You could try again or choose a different LSP.");
      return false;
    } finally {
      setFetchingLspInfo(false);
      setLoading(false);
    }
  };
  
  // Function to connect to node via backend
  const connectNodeViaBackend = async (uri, lspSlug) => {
    try {
      console.log(`Connecting to node with URI: ${uri}`);
      
      const response = await fetch(`/stores/${props.storeId}/plugins/lsps1/connect-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uri: uri,
          lspSlug: lspSlug
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Successfully connected to node");
        return { success: true };
      } else {
        console.error("Failed to connect to node:", data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error connecting to node:", error);
      return { success: false, error: error.message || "Error connecting to node" };
    }
  };

  // For the "Connect to LSP" button
  const connectToLsp = () => {
    setLoading(true);
    getLspInfoDirectly();
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