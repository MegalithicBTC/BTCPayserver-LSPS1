// ChannelConfiguration component - Configures and creates channels
window.ChannelConfiguration = function(configProps) {
  const { channelSize, setChannelSize, lspInfo, lspUrl, nodePublicKey, setOrderResult } = configProps;
  
  // Get channel options directly from ChannelOrderManager
  const getChannelOptions = () => {
    if (window.ChannelOrderManager && window.ChannelOrderManager.options) {
      return window.ChannelOrderManager.options;
    }
    
    // If not yet initialized in ChannelOrderManager, process directly using LspManager
    return window.LspManager.processChannelOptions(lspInfo);
  };
  
  const channelOptions = getChannelOptions();
  const [errorMessage, setErrorMessage] = React.useState(null);
  
  // Show error if channel options aren't available
  React.useEffect(() => {
    if (!channelOptions) {
      setErrorMessage("LSP did not provide valid channel configuration. Please try again or contact the LSP administrator.");
    } else {
      setErrorMessage(null);
    }
  }, [channelOptions]);

  // Initialize channel order manager if needed
  React.useEffect(() => {
    if (lspInfo && lspUrl && nodePublicKey) {
      console.log("Initializing ChannelOrderManager with:", { 
        lspInfo: lspInfo, 
        lspUrl: lspUrl, 
        nodePublicKey: nodePublicKey 
      });
      
      window.ChannelOrderManager.init(lspInfo, lspUrl, nodePublicKey);
    }
  }, [lspInfo, lspUrl, nodePublicKey]);
  
  // State for private/public channel toggle - default to public (true)
  const [isPublicChannel, setIsPublicChannel] = React.useState(true);
  const [isGettingPrice, setIsGettingPrice] = React.useState(false);
  // Add state for showing/hiding advanced options
  const [showOptions, setShowOptions] = React.useState(false);
  
  // Handle get price button click
  const handleGetPrice = async () => {
    if (!channelSize || !nodePublicKey || !channelOptions) {
      console.error("Missing required data for getting price");
      setErrorMessage("Missing required configuration from LSP. Please try again.");
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
  
  // If we don't have valid channel options, show error
  if (errorMessage) {
    return React.createElement('div', { className: 'alert alert-danger' }, errorMessage);
  }
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header' }, 'Choose a Channel Size'),
    React.createElement('div', { className: 'card-body' },
      // Add recommendation note before the slider
      React.createElement('div', { className: 'text-muted small mb-3' },
        'We recommend that you open channels of at least 1,000,000 satoshis in size'
      ),
      
      React.createElement(window.ChannelSizeSlider, {
        channelSize,
        setChannelSize,
        options: channelOptions,
        disabled: isGettingPrice
      }),
      
      // Advanced options link
      React.createElement('div', { className: 'mt-3 text-center' },
        React.createElement('button', {
          className: 'd-inline-flex align-items-center btn btn-link fs-6 text-muted p-0',
          type: 'button',
          onClick: () => setShowOptions(!showOptions)
        },
          React.createElement('span', { className: 'me-1' }, 'Advanced Options'),
          React.createElement('vc:icon', { symbol: showOptions ? 'caret-up' : 'caret-down' })
        )
      ),
      
      // Only show options if showOptions is true
      showOptions && React.createElement('div', { className: 'mt-3 pt-2 border-top' },
        React.createElement('div', { className: 'form-group mb-3' },
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
              : 'Private channels are only known to you and the LSP, offering better privacy, but private channels cannot be used for routing.'
          ),
          !isPublicChannel && React.createElement('div', { className: 'mt-3' },
            React.createElement('img', { src: '/Resources/img/add-hop-hints.png', className: 'mb-2', style: { maxWidth: '100%' } }),
            React.createElement('p', { className: 'form-text text-muted small' },
              'Private channels add complexity. Be careful to never mix public and private channels with the same LSP. If you use a private channel, please be advised: When generating invoices, you need to select "Add hop hints for private channels to the Lightning invoice."'
            )
          )
        )
      ),
      
      // Node public key display - more subtle
      React.createElement('p', { className: 'text-muted small mt-3' }, `Your Node's Public Key: `, 
        React.createElement('code', { className: 'text-muted' }, nodePublicKey || 'Not available')
      ),
      
      React.createElement('button', { 
        className: 'btn btn-primary mt-3', 
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