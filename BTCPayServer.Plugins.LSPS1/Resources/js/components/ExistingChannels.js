// ExistingChannels component - Shows only Lightning channels connected to known LSPs
window.ExistingChannels = function(channelsProps) {
  const { channels: initialChannels } = channelsProps;
  
  // State to store channels and loading state
  const [filteredChannels, setFilteredChannels] = React.useState([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState(new Date());
  const [pollingActive, setPollingActive] = React.useState(false);
  const [lspPubKeys, setLspPubKeys] = React.useState([]);
  
  // Helper function to get LSP public keys from localStorage
  const getLspPubKeysFromStorage = () => {
    try {
      const storedKeys = localStorage.getItem('lsps1_lsp_pubkeys');
      return storedKeys ? JSON.parse(storedKeys) : [];
    } catch (error) {
      console.error('Error retrieving LSP public keys from localStorage:', error);
      return [];
    }
  };
  
  // Filter channels to only show those connected to LSPs
  const filterLspChannels = (allChannels) => {
    const pubKeys = getLspPubKeysFromStorage();
    setLspPubKeys(pubKeys);
    
    // Log all channels each time we update (this helps with debugging)
    console.log("All Lightning Channels:", JSON.stringify(allChannels, null, 2));
    
    return allChannels.filter(channel => {
      const remotePubKey = channel.remotePubKey || '';
      return pubKeys.some(lspKey => remotePubKey.startsWith(lspKey));
    });
  };
  
  // Initialize and update channels
  React.useEffect(() => {
    // Initial filtering
    const initialFiltered = filterLspChannels(initialChannels || []);
    setFilteredChannels(initialFiltered);
    console.log("Initial filtered channels:", JSON.stringify(initialFiltered, null, 2));
    
    // Listen for channel update events
    const handleChannelsUpdated = (event) => {
      console.log("Channels updated event received:", event.detail);
      const updatedFilteredChannels = filterLspChannels(event.detail);
      console.log("Updated filtered channels:", JSON.stringify(updatedFilteredChannels, null, 2));
      setFilteredChannels(updatedFilteredChannels);
      setLastUpdated(new Date());
      setIsRefreshing(false);
    };
    
    // Register event listener
    document.addEventListener('channels-updated', handleChannelsUpdated);
    
    // Start polling for channel updates
    if (window.ChannelManager && typeof window.ChannelManager.startChannelPolling === 'function') {
      window.ChannelManager.startChannelPolling();
      setPollingActive(true);
      console.log("Channel polling started at", new Date().toLocaleTimeString());
    } else {
      console.warn("ChannelManager.startChannelPolling not available");
    }
    
    // Cleanup function
    return () => {
      document.removeEventListener('channels-updated', handleChannelsUpdated);
      
      // Stop polling when the component unmounts
      if (pollingActive && window.ChannelManager && typeof window.ChannelManager.stopChannelPolling === 'function') {
        window.ChannelManager.stopChannelPolling();
        console.log("Channel polling stopped at", new Date().toLocaleTimeString());
      }
    };
  }, [initialChannels]);
  
  // Format balance values
  const formatBalance = (sats) => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)} M sats`;
    } else {
      return `${(sats).toLocaleString()} sats`;
    }
  };
  
  // Format date with time
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(date);
  };
  
  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (window.ChannelManager && typeof window.ChannelManager.refreshChannels === 'function') {
      console.log("Manual refresh triggered at", new Date().toLocaleTimeString());
      await window.ChannelManager.refreshChannels();
    } else {
      console.warn("ChannelManager.refreshChannels not available");
      // Fallback to no-op
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };
  
  // Render individual channel rows
  const renderChannelRows = () => {
    return filteredChannels.map((channel, index) => {
      return React.createElement('tr', { key: channel.channelId || index },
        React.createElement('td', null, 
          React.createElement('code', { className: 'small' }, 
            (channel.remotePubKey || '').substring(0, 20) + '...'
          )
        ),
        React.createElement('td', null, formatBalance(channel.capacity)),
        React.createElement('td', null, formatBalance(channel.localBalance)),
        React.createElement('td', null, 
          React.createElement('span', { 
            className: channel.active ? 'badge bg-success' : 'badge bg-danger' 
          }, channel.active ? 'Active' : 'Inactive')
        ),
        React.createElement('td', null, 
          React.createElement('span', { 
            className: channel.public ? 'badge bg-info' : 'badge bg-secondary' 
          }, channel.public ? 'Public' : 'Private')
        )
      );
    });
  };
  
  // Show raw JSON of channels
  const renderRawJson = () => {
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('details', null,
        React.createElement('summary', { className: 'text-muted small' }, 'Show Raw Channel Data'),
        React.createElement('pre', { className: 'mt-2 p-2 bg-light border rounded small' },
          JSON.stringify(filteredChannels, null, 2)
        )
      )
    );
  };
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header d-flex justify-content-between align-items-center' }, 
      'Your LSP Lightning Channels',
      React.createElement('div', null,
        React.createElement('button', { 
          className: 'btn btn-sm btn-outline-primary', 
          onClick: handleRefresh,
          disabled: isRefreshing
        }, 
          isRefreshing ? 
            React.createElement('span', { className: 'spinner-border spinner-border-sm me-1' }) : 
            React.createElement('i', { className: 'bi bi-arrow-clockwise me-1' }),
          'Refresh'
        )
      )
    ),
    React.createElement('div', { className: 'card-body' },
      lspPubKeys.length === 0 ? 
        React.createElement('div', { className: 'alert alert-info' },
          'No LSP public keys stored. Connect to an LSP first to track channels.'
        ) :
        filteredChannels.length > 0 ?
          React.createElement(React.Fragment, null,
            React.createElement('div', { className: 'table-responsive' },
              React.createElement('table', { className: 'table table-striped' },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', null, 'Remote Node'),
                    React.createElement('th', null, 'Capacity'),
                    React.createElement('th', null, 'Local Balance'),
                    React.createElement('th', null, 'Status'),
                    React.createElement('th', null, 'Visibility')
                  )
                ),
                React.createElement('tbody', null, renderChannelRows())
              )
            ),
            React.createElement('div', { className: 'text-muted small mt-2' }, 
              'Last updated: ', formatDate(lastUpdated),
              React.createElement('span', { className: 'ms-2' },
                '(Auto-refreshing every 5 seconds)'
              )
            ),
            renderRawJson()
          ) :
          React.createElement('div', { className: 'alert alert-info' }, 
            'You don\'t have any active channels with known LSPs. Get a Lightning channel below!'
          )
    )
  );
};