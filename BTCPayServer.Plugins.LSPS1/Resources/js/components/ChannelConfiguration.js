// ChannelConfiguration component - Configures and creates channels
window.ChannelConfiguration = function(configProps) {
  const { channelSize, setChannelSize, lspInfo, lspUrl, nodePublicKey, setOrderResult } = configProps;
  
  // Get channel options from LSP info or ChannelOrderManager if available
  const getChannelOptions = () => {
    // Try to get options from ChannelOrderManager first
    if (window.ChannelOrderManager && window.ChannelOrderManager.options) {
      return window.ChannelOrderManager.options;
    }
    
    // Fall back to LspConfigManager
    if (window.LspConfigManager && typeof window.LspConfigManager.processChannelOptions === 'function') {
      return window.LspConfigManager.processChannelOptions(lspInfo);
    }
    
    // Last resort: create basic options object with defaults
    return {
      minSats: 100000,
      maxSats: 16777215,
      minChannelSize: 100000,
      maxChannelSize: 16777215,
      defaultChannelSize: 1000000,
      feeRatePercent: 0.1
    };
  };
  
  const channelOptions = getChannelOptions();
  
  // Initialize channel order manager if needed
  React.useEffect(() => {
    if (lspInfo && lspUrl && nodePublicKey) {
      console.log("Initializing ChannelOrderManager with:", { 
        lspInfo: lspInfo, 
        lspUrl: lspUrl, 
        nodePublicKey: nodePublicKey 
      });
      
      if (typeof window.ChannelOrderManager.init === 'function') {
        window.ChannelOrderManager.init(lspInfo, lspUrl, nodePublicKey);
      } else {
        console.error("ChannelOrderManager.init is not available");
      }
    }
  }, [lspInfo, lspUrl, nodePublicKey]);
  
  // State for private/public channel toggle - default to public (true)
  const [isPublicChannel, setIsPublicChannel] = React.useState(true);
  const [isGettingPrice, setIsGettingPrice] = React.useState(false);
  
  // Handle get price button click
  const handleGetPrice = async () => {
    if (!channelSize || !nodePublicKey) {
      console.error("Missing required data for getting price");
      return;
    }
    
    setIsGettingPrice(true);
    try {
      // Call the channel order manager to create an order directly with the LSP
      const result = await window.ChannelOrderManager.createOrder(channelSize, !isPublicChannel);
      setOrderResult(result);
    } finally {
      setIsGettingPrice(false);
    }
  };
  
  // Log what values we have for debugging
  console.log("Channel configuration rendering with:", {
    channelSize,
    channelOptions,
    lspInfo: lspInfo ? Object.keys(lspInfo).length + " props" : "none",
    nodePublicKey: nodePublicKey ? nodePublicKey.substring(0, 10) + "..." : "none"
  });
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header' }, 'Lightning Channel Configuration'),
    React.createElement('div', { className: 'card-body' },
      React.createElement(window.ChannelSizeSlider, {
        channelSize,
        setChannelSize,
        options: channelOptions,  // Correct prop name is "options" not "channelOptions"
        disabled: isGettingPrice
      }),
      
      React.createElement('div', { className: 'form-group mb-3 mt-3' },
        React.createElement('div', { className: 'd-flex align-items-center' },
          React.createElement('input', {
            type: 'checkbox',
            className: 'btcpay-toggle me-3',
            id: 'channelPrivacyToggle',
            checked: isPublicChannel,
            onChange: (e) => setIsPublicChannel(e.target.checked)
          }),
          React.createElement('label', { 
            className: 'form-check-label mb-0', 
            htmlFor: 'channelPrivacyToggle' 
          }, isPublicChannel ? 'Public Channel' : 'Private Channel')
        ),
        React.createElement('div', { className: 'form-text text-muted small mt-2' },
          isPublicChannel 
            ? 'Public channels are visible to the network and can be used for routing payments.'
            : 'Private channels are only known to you and the LSP, offering better privacy but cannot be used for routing.'
        )
      ),
      
      React.createElement('p', null, 'Node Public Key: ', 
        React.createElement('code', { className: 'small' }, nodePublicKey || 'Not available')
      ),
      
      React.createElement('button', { 
        className: 'btn btn-primary', 
        type: 'button',
        onClick: handleGetPrice,
        disabled: isGettingPrice
      }, 
        isGettingPrice ? 
          React.createElement(React.Fragment, null, 
            React.createElement('span', { className: 'spinner-border spinner-border-sm me-2' }),
            'Getting Price...'
          ) : 
          'Get Price'
      )
    )
  );
};