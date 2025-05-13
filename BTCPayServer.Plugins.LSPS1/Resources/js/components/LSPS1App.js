// LSPS1App - Main application component
window.LSPS1App = function(props) {
  const [loading, setLoading] = React.useState(true);
  const [userNodeIsConnectedToLsp, setUserNodeIsConnectedToLsp] = React.useState(props.userNodeIsConnectedToLsp);
  const [userNodeFailedToConnectToLsp, setUserNodeFailedToConnectToLsp] = React.useState(props.userNodeFailedToConnectToLsp);
  const [connectionMessage, setConnectionMessage] = React.useState(""); // Calculated in UI based on connection status
  const [connectedLspName, setConnectedLspName] = React.useState(props.connectedLspName);
  const [lspInfo, setLspInfo] = React.useState(JSON.parse(props.lspInfoJson || '{}'));
  const [orderResult, setOrderResult] = React.useState(null);
  const [channelSize, setChannelSize] = React.useState(1000000);
  const [userChannels, setUserChannels] = React.useState(props.userChannels || []);
  
  React.useEffect(() => {
    console.log("Initializing LSPS1 App");
    
    // Set connection message based on status
    if (userNodeIsConnectedToLsp && connectedLspName) {
      setConnectionMessage(`Connected to ${connectedLspName}`);
    } else if (userNodeFailedToConnectToLsp) {
      setConnectionMessage(`Failed to connect to Lightning Service Provider`);
    } else {
      setConnectionMessage('Not connected to any Lightning Service Provider');
    }
    
    const initialize = async () => {
      try {
        // If user has no Lightning node, don't attempt to load LSP info
        if (!props.userHasLightningNode) {
          console.log("No Lightning node configured, skipping LSP connection");
          setLoading(false);
          return;
        }
        
        // If we already have LSP info loaded, we can skip fetching it
        if (lspInfo && Object.keys(lspInfo).length > 0) {
          console.log("LSP info already loaded");
          setLoading(false);
          return;
        }
        
        // Display channels information
        if (userChannels && userChannels.length > 0) {
          console.log(`User has ${userChannels.length} active Lightning channels`);
        } else {
          console.log("User has no active Lightning channels");
        }
        
        // Attempt to load LSP info
        let attempts = 0;
        const checkInterval = setInterval(() => {
          const updatedInfo = window.LspManager.loadLspInfo();
          if (updatedInfo && Object.keys(updatedInfo).length > 0) {
            console.log("LSP info loaded, showing UI");
            setLspInfo(updatedInfo);
            setLoading(false);
            clearInterval(checkInterval);
            window.ChannelOrderManager.init(updatedInfo);
          }
          
          attempts++;
          if (attempts > 20) {
            console.log("Loading timeout reached, showing UI regardless");
            setLoading(false);
            clearInterval(checkInterval);
          }
        }, 500);
      } catch (error) {
        console.error("Error initializing app:", error);
        setLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  // Determine content based on lightning node availability
  const renderContent = () => {
    // If user has no lightning node connected, show setup instructions
    if (!props.userHasLightningNode) {
      return React.createElement(window.LightningNodeSetup, {
        storeId: props.storeId,
        lightningSetupUrl: `/stores/${props.storeId}/lightning/BTC/setup` // Generate URL from storeId
      });
    }
    
    // Otherwise show the regular channel configuration components
    return React.createElement(React.Fragment, null,
      // Show existing channels if any
      userChannels && userChannels.length > 0 && React.createElement(window.ExistingChannels, {
        channels: userChannels
      }),
      
      React.createElement(window.ChannelConfiguration, {
        channelSize: channelSize,
        setChannelSize: setChannelSize,
        lspInfo: lspInfo,
        nodePublicKey: props.nodePublicKey,
        xsrfToken: props.xsrfToken,
        setOrderResult: setOrderResult
      }),
      
      orderResult && React.createElement(window.OrderResult, { result: orderResult })
    );
  };
  
  return React.createElement('div', { className: 'lsps1-container' },
    loading ? 
      React.createElement(window.LoadingSpinner) : 
      renderContent(),
    
    // Only show connection footer if a lightning node is configured
    props.userHasLightningNode && React.createElement(window.ConnectionFooter, {
      userNodeIsConnectedToLsp: userNodeIsConnectedToLsp,
      userNodeFailedToConnectToLsp: userNodeFailedToConnectToLsp,
      connectedLspName: connectedLspName,
      availableLsps: props.availableLsps,
      storeId: props.storeId
    })
  );
};