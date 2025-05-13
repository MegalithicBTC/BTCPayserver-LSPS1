// LSPS1App - Main application component
window.LSPS1App = function(props) {
  const [loading, setLoading] = React.useState(true);
  const [connectionSuccessful, setConnectionSuccessful] = React.useState(props.initialConnectionStatus === 'true');
  const [connectionMessage, setConnectionMessage] = React.useState(props.initialConnectionMessage);
  const [connectedLspName, setConnectedLspName] = React.useState(props.initialConnectedLspName);
  const [lspInfo, setLspInfo] = React.useState(JSON.parse(props.initialLspInfoJson || '{}'));
  const [orderResult, setOrderResult] = React.useState(null);
  const [channelSize, setChannelSize] = React.useState(1000000);
  
  React.useEffect(() => {
    console.log("Initializing LSPS1 App");
    
    const initialize = async () => {
      try {
        if (lspInfo && Object.keys(lspInfo).length > 0) {
          setLoading(false);
          return;
        }
        
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
    if (!props.hasLightningNode) {
      return React.createElement(window.LightningNodeSetup, {
        storeId: props.storeId,
        lightningSetupUrl: props.lightningSetupUrl
      });
    }
    
    // Otherwise show the regular channel configuration components
    return React.createElement(React.Fragment, null,
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
    props.hasLightningNode && React.createElement(window.ConnectionFooter, {
      connectionSuccessful: connectionSuccessful,
      connectedLspName: connectedLspName,
      availableLsps: props.availableLsps,
      storeId: props.storeId
    })
  );
};