// ChannelConfiguration component - Configures and creates channels
window.ChannelConfiguration = function(configProps) {
  const { channelSize, setChannelSize, lspInfo, nodePublicKey, xsrfToken, setOrderResult } = configProps;
  
  // Get channel options from LSP info
  const channelOptions = window.LspManager.processChannelOptions(lspInfo);
  
  // Handle create channel button click
  const handleCreateChannel = async () => {
    if (!channelSize || !xsrfToken) {
      console.error("Missing required data for channel creation");
      return;
    }
    
    const result = await window.ChannelOrderManager.createOrder(channelSize, xsrfToken);
    setOrderResult(result);
  };
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header' }, 'Lightning Channel Configuration'),
    React.createElement('div', { className: 'card-body' },
      channelOptions && React.createElement(window.ChannelSizeSlider, {
        channelSize,
        setChannelSize,
        channelOptions
      }),
      React.createElement('p', null, 'Node Public Key: ', 
        React.createElement('code', { className: 'small' }, nodePublicKey || 'Not available')
      ),
      React.createElement('button', { 
        className: 'btn btn-primary', 
        type: 'button',
        onClick: handleCreateChannel
      }, 'Create Channel')
    )
  );
};