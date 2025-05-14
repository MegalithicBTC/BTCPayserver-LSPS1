// LSPS1App - Main application component
window.LSPS1App = function(props) {
  const [loading, setLoading] = React.useState(false); // Don't start loading until user takes action
  const [userNodeIsConnectedToLsp, setUserNodeIsConnectedToLsp] = React.useState(props.userNodeIsConnectedToLsp);
  const [userNodeFailedToConnectToLsp, setUserNodeFailedToConnectToLsp] = React.useState(props.userNodeFailedToConnectToLsp);
  const [connectionMessage, setConnectionMessage] = React.useState("Your Lightning node is online.");
  const [connectedLspName, setConnectedLspName] = React.useState(props.connectedLspName);
  const [lspInfo, setLspInfo] = React.useState(JSON.parse(props.lspInfoJson || '{}'));
  const [orderResult, setOrderResult] = React.useState(null);
  const [channelSize, setChannelSize] = React.useState(1000000); // Default to 1,000,000 sats
  const [userChannels, setUserChannels] = React.useState(props.userChannels || []);
  const [showChannelConfig, setShowChannelConfig] = React.useState(false);
  const [fetchingLspInfo, setFetchingLspInfo] = React.useState(false);
  const [lspErrorMessage, setLspErrorMessage] = React.useState("");
  
  // Helper function to process LSP info and store public keys
  const processLspInfoAndStoreKeys = (lspInfo) => {
    if (!lspInfo || !lspInfo.uris || !Array.isArray(lspInfo.uris) || lspInfo.uris.length === 0) {
      console.warn("No valid URIs in LSP info to store");
      return;
    }
    
    // Use the LspStorageManager to store public keys
    if (window.LspStorageManager && typeof window.LspStorageManager.storeLspPubKeysFromUris === 'function') {
      window.LspStorageManager.storeLspPubKeysFromUris(lspInfo.uris);
      console.log("Stored LSP public keys from URIs:", lspInfo.uris);
    } else {
      console.error("LspStorageManager.storeLspPubKeysFromUris not available");
    }
  };

  // Function to get LSP info and connect to the LSP
  const getLspInfo = async () => {
    try {
      setFetchingLspInfo(true);
      setLspErrorMessage("");
      
      // Default to Megalith LSP if none selected
      const lspSlug = props.selectedLspSlug || 'megalith-lsp';
      
      console.log(`Getting LSP info for ${lspSlug}`);
      const response = await fetch(`/stores/${props.storeId}/plugins/lsps1/get-lsp-info?lspSlug=${lspSlug}`);
      const data = await response.json();
      
      if (data.success && data.lspInfo) {
        console.log("Successfully retrieved LSP info:", data.lspInfo);
        setLspInfo(data.lspInfo);
        setUserNodeIsConnectedToLsp(true);
        setUserNodeFailedToConnectToLsp(false);
        setConnectedLspName(props.availableLsps.find(l => l.slug === lspSlug)?.name || "LSP");
        setConnectionMessage(`Connected to ${props.availableLsps.find(l => l.slug === lspSlug)?.name || "LSP"}`);
        
        // Process LSP info and store public keys
        processLspInfoAndStoreKeys(data.lspInfo);
        
        // Make sure we have the lspUrl
        if (!data.lspUrl) {
          console.error("LSP URL is missing in response");
          setLspErrorMessage("LSP URL is missing. Please try again.");
          return false;
        }
        
        // Store LSP info for later use - Check if services are available first
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
        
        if (window.LspManager) {
          if (typeof window.LspManager.storeLspInfo === 'function') {
            window.LspManager.storeLspInfo(data.lspInfo);
            console.log("LSP info stored in LspManager");
          } else {
            console.error("LspManager.storeLspInfo method is not available");
          }
        } else {
          console.error("LspManager is not available");
        }
        
        // Only initialize ChannelOrderManager if it exists and has an init method
        if (window.ChannelOrderManager) {
          if (typeof window.ChannelOrderManager.init === 'function') {
            try {
              window.ChannelOrderManager.init(data.lspInfo, data.lspUrl, props.nodePublicKey);
              console.log("ChannelOrderManager initialized successfully");
            } catch (err) {
              console.error("Error initializing ChannelOrderManager:", err);
              setLspErrorMessage("Error initializing channel order manager. Please refresh and try again.");
              return false;
            }
          } else {
            console.error("ChannelOrderManager.init method is not available");
            setLspErrorMessage("Channel order manager is missing required functionality. Please refresh and try again.");
            return false;
          }
        } else {
          console.error("ChannelOrderManager is not available");
          setLspErrorMessage("Channel order manager is not available. Please refresh and try again.");
          return false;
        }
        
        // Show the channel configuration with default values
        setChannelSize(1000000); // Ensure default of 1,000,000 sats
        setShowChannelConfig(true);
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

  // For the "Get a Lightning Channel" button
  const getChannel = () => {
    setLoading(true);
    getLspInfo();
  };

  // Determine content based on lightning node availability
  const renderContent = () => {
    // If user has no lightning node connected, show setup instructions and an error
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
    
    // If user's node is online but we haven't shown the channel config yet
    if (!showChannelConfig) {
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'text-center mb-4' },
          React.createElement('button', {
            className: 'btn btn-primary btn-lg',
            onClick: getChannel,
            disabled: fetchingLspInfo
          }, fetchingLspInfo ? 'Connecting...' : 'Get a Lightning Channel'),
          
          lspErrorMessage && React.createElement('div', {
            className: 'alert alert-danger mt-3'
          }, lspErrorMessage)
        )
      );
    }
    
    // Otherwise show the channel configuration components
    return React.createElement(React.Fragment, null,
      // Show existing channels if any
      userChannels && userChannels.length > 0 && React.createElement(window.ExistingChannels, {
        channels: userChannels
      }),
      
      // Only show the ChannelConfiguration if we don't have an order result yet
      !orderResult && React.createElement(window.ChannelConfiguration, {
        channelSize: channelSize,
        setChannelSize: setChannelSize,
        lspInfo: lspInfo,
        lspUrl: props.lspUrl,
        nodePublicKey: props.nodePublicKey,
        xsrfToken: props.xsrfToken,
        setOrderResult: setOrderResult
      }),
      
      // Show order result (invoice) when available
      orderResult && React.createElement(window.OrderResult, { result: orderResult })
    );
  };
  
  return React.createElement('div', { className: 'lsps1-container' },
    loading ? 
      React.createElement(window.LoadingSpinner) : 
      renderContent(),
    
    // Only show connection footer if a lightning node is configured and we're showing channel config
    props.userHasLightningNode && showChannelConfig && React.createElement(window.ConnectionFooter, {
      userNodeIsConnectedToLsp: userNodeIsConnectedToLsp,
      userNodeFailedToConnectToLsp: userNodeFailedToConnectToLsp,
      connectedLspName: connectedLspName,
      availableLsps: props.availableLsps,
      storeId: props.storeId
    })
  );
};