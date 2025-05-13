// ExistingChannels component - Shows a list of the user's existing Lightning channels
window.ExistingChannels = function(channelsProps) {
  const { channels: initialChannels } = channelsProps;
  
  // State to store channels and loading state
  const [channels, setChannels] = React.useState(initialChannels || []);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState(new Date());
  
  // Update channels when they change
  React.useEffect(() => {
    // Listen for channel update events
    const handleChannelsUpdated = (event) => {
      console.log("Channels updated event received:", event.detail);
      setChannels(event.detail);
      setLastUpdated(new Date());
      setIsRefreshing(false);
    };
    
    // Register event listener
    document.addEventListener('channels-updated', handleChannelsUpdated);
    
    // Start polling for channel updates
    window.ChannelManager.startChannelPolling();
    
    // Cleanup function
    return () => {
      document.removeEventListener('channels-updated', handleChannelsUpdated);
      window.ChannelManager.stopChannelPolling();
    };
  }, []);
  
  // Format balance values
  const formatBalance = (sats) => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)} M sats`;
    } else {
      return `${(sats).toLocaleString()} sats`;
    }
  };
  
  // Format date
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
    await window.ChannelManager.refreshChannels();
  };
  
  // Render individual channel rows
  const renderChannelRows = () => {
    return channels.map((channel, index) => {
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
          JSON.stringify(channels, null, 2)
        )
      )
    );
  };
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header d-flex justify-content-between align-items-center' }, 
      'Your Lightning Channels',
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
      channels.length > 0 ?
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
            'Last updated: ', formatDate(lastUpdated)
          ),
          renderRawJson()
        ) :
        React.createElement('div', { className: 'alert alert-info' }, 
          'You don\'t have any Lightning channels yet. Create one below!'
        )
    )
  );
};