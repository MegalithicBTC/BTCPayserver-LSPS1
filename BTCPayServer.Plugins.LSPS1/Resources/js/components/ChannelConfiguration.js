// ChannelConfiguration component - Configures and creates channels
window.ChannelConfiguration = function(configProps) {
  const { channelSize, setChannelSize, lspInfo, lspUrl, nodePublicKey, setOrderResult } = configProps;
  
  // Get channel options from LSP info
  const channelOptions = window.LspManager.processChannelOptions(lspInfo);
  
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
  
  // State for private channel toggle
  const [isPrivateChannel, setIsPrivateChannel] = React.useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = React.useState(false);
  
  // Handle create channel button click
  const handleCreateChannel = async () => {
    if (!channelSize || !nodePublicKey) {
      console.error("Missing required data for channel creation");
      return;
    }
    
    setIsCreatingOrder(true);
    try {
      // Call the channel order manager to create an order directly with the LSP
      const result = await window.ChannelOrderManager.createOrder(channelSize, isPrivateChannel);
      setOrderResult(result);
    } finally {
      setIsCreatingOrder(false);
    }
  };
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header' }, 'Lightning Channel Configuration'),
    React.createElement('div', { className: 'card-body' },
      channelOptions && React.createElement(window.ChannelSizeSlider, {
        channelSize,
        setChannelSize,
        channelOptions
      }),
      
      React.createElement('div', { className: 'form-check form-switch mb-3' },
        React.createElement('input', {
          className: 'form-check-input',
          type: 'checkbox',
          id: 'privateChannelSwitch',
          checked: isPrivateChannel,
          onChange: (e) => setIsPrivateChannel(e.target.checked)
        }),
        React.createElement('label', { 
          className: 'form-check-label', 
          htmlFor: 'privateChannelSwitch' 
        }, 'Create Private Channel'),
        React.createElement('div', { className: 'form-text text-muted small' },
          'Public channels (default) are visible to the network. Private channels are only known to you and the LSP.'
        )
      ),
      
      React.createElement('p', null, 'Node Public Key: ', 
        React.createElement('code', { className: 'small' }, nodePublicKey || 'Not available')
      ),
      
      React.createElement('button', { 
        className: 'btn btn-primary', 
        type: 'button',
        onClick: handleCreateChannel,
        disabled: isCreatingOrder
      }, 
        isCreatingOrder ? 
          React.createElement(React.Fragment, null, 
            React.createElement('span', { className: 'spinner-border spinner-border-sm me-2' }),
            'Creating Channel...'
          ) : 
          'Create Channel'
      )
    )
  );
};