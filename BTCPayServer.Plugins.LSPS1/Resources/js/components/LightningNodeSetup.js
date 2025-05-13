// LightningNodeSetup component - Shows a message when no Lightning node is configured
window.LightningNodeSetup = function(props) {
  const { storeId, lightningSetupUrl } = props;
  
  return React.createElement('div', { className: 'card mb-4' },
    React.createElement('div', { className: 'card-header bg-warning' },
      'Lightning Node Required'
    ),
    React.createElement('div', { className: 'card-body' },
      React.createElement('p', null, 
        'To get an inbound channel, you need to connect BTCPay to a Lightning Node first.'
      ),
      React.createElement('p', null,
        'A Lightning node allows you to receive payments over the Lightning Network, which is faster and cheaper than on-chain transactions.'
      ),
      React.createElement('div', { className: 'text-center mt-4' },
        React.createElement('a', {
          href: lightningSetupUrl,
          className: 'btn btn-primary btn-lg'
        }, 'Set up Lightning Node')
      )
    )
  );
};