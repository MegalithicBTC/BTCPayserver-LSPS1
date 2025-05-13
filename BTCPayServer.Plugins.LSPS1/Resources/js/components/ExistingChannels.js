// ExistingChannels component - Shows a list of the user's existing Lightning channels
window.ExistingChannels = function(channelsProps) {
  const { channels } = channelsProps;
  
  // Format balance values
  const formatBalance = (sats) => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)} M sats`;
    } else {
      return `${(sats).toLocaleString()} sats`;
    }
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
        )
      );
    });
  };
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header' }, 'Your Lightning Channels'),
    React.createElement('div', { className: 'card-body' },
      channels.length > 0 ?
        React.createElement('div', { className: 'table-responsive' },
          React.createElement('table', { className: 'table table-striped' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Remote Node'),
                React.createElement('th', null, 'Capacity'),
                React.createElement('th', null, 'Local Balance'),
                React.createElement('th', null, 'Status')
              )
            ),
            React.createElement('tbody', null, renderChannelRows())
          )
        ) :
        React.createElement('p', { className: 'text-center' }, 'No Lightning channels found. Create one below.')
    )
  );
};