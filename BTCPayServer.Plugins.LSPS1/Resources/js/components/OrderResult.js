// OrderResult component - Shows results of a channel order
window.OrderResult = function(resultProps) {
  const { result } = resultProps;
  
  // Create state to store the latest order status updates
  const [orderStatus, setOrderStatus] = React.useState(null);
  
  // Static method for the ChannelOrderManager to call
  window.OrderResult.updateStatus = function(statusData) {
    // Find all OrderResult instances and update them
    const event = new CustomEvent('order-status-updated', { detail: statusData });
    document.dispatchEvent(event);
  };
  
  // Effect to listen for status updates
  React.useEffect(() => {
    const handleStatusUpdate = (event) => {
      setOrderStatus(event.detail);
    };
    
    document.addEventListener('order-status-updated', handleStatusUpdate);
    
    return () => {
      document.removeEventListener('order-status-updated', handleStatusUpdate);
    };
  }, []);
  
  // Determine appropriate alert class based on result
  const alertClass = result.success ? 'alert-success' : 'alert-danger';
  
  // Get the most current status data
  const statusData = orderStatus || (result.success ? result.data : null);
  
  // Render the invoice section if there's an invoice
  const renderInvoice = () => {
    if (!result.success || !result.data || !result.data.invoice) {
      return null;
    }
    
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('h5', null, 'Pay this invoice to create your channel'),
      React.createElement('div', { className: 'input-group mb-3' },
        React.createElement('input', {
          type: 'text',
          className: 'form-control',
          value: result.data.invoice,
          readOnly: true
        }),
        React.createElement('button', {
          className: 'btn btn-outline-secondary',
          type: 'button',
          onClick: () => {
            navigator.clipboard.writeText(result.data.invoice);
            alert('Invoice copied to clipboard!');
          }
        }, 'Copy')
      ),
      React.createElement('div', { className: 'text-center mb-3' },
        React.createElement('img', {
          src: `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(result.data.invoice)}`,
          alt: 'Invoice QR Code',
          width: 250,
          height: 250
        })
      )
    );
  };
  
  // Render status updates
  const renderStatus = () => {
    if (!statusData) return null;
    
    let statusMessage = 'Order processing...';
    let statusClass = 'text-info';
    
    if (statusData.status === 'complete') {
      statusMessage = 'Channel successfully created!';
      statusClass = 'text-success';
    } else if (statusData.status === 'failed') {
      statusMessage = 'Channel creation failed';
      statusClass = 'text-danger';
    } else if (statusData.status === 'waiting_for_payment') {
      statusMessage = 'Waiting for invoice payment...';
      statusClass = 'text-warning';
    }
    
    return React.createElement('div', { className: `alert ${statusClass} mt-3` },
      React.createElement('h5', null, 'Order Status:'),
      React.createElement('p', { className: 'mb-0' }, statusMessage)
    );
  };
  
  // Show raw JSON of order data
  const renderRawJson = () => {
    const dataToShow = result.success ? result.data : result.error;
    
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('details', null,
        React.createElement('summary', { className: 'text-muted small' }, 'Show Raw Order Data'),
        React.createElement('pre', { className: 'mt-2 p-2 bg-light border rounded small' },
          JSON.stringify(result.success ? result.data : { error: result.error }, null, 2)
        )
      )
    );
  };
  
  // Show raw JSON of status data
  const renderStatusJson = () => {
    if (!statusData) return null;
    
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('details', null,
        React.createElement('summary', { className: 'text-muted small' }, 'Show Raw Status Data'),
        React.createElement('pre', { className: 'mt-2 p-2 bg-light border rounded small' },
          JSON.stringify(statusData, null, 2)
        )
      )
    );
  };
  
  return React.createElement('div', { className: `alert ${alertClass}` },
    React.createElement('h4', null, result.success ? 'Channel Order Created' : 'Error Creating Channel Order'),
    React.createElement('p', null, result.success ? 
      'Your channel order has been created. Please pay the invoice below.' : 
      `Error: ${result.error}`
    ),
    renderInvoice(),
    renderStatus(),
    renderRawJson(),
    statusData && renderStatusJson()
  );
};