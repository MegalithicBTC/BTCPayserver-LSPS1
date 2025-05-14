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
    
    // Generate lightning: URL for the invoice
    const lightningUrl = `lightning:${result.data.invoice}`;
    
    return React.createElement('div', { className: 'mt-3 text-center' },
      React.createElement('h5', null, 'Pay this invoice to create your channel'),
      
      // QR code container with clipboard functionality
      React.createElement('div', { 
        className: 'qr-container mb-3', 
        style: { 
          position: 'relative',
          display: 'inline-block',
          cursor: 'pointer'
        }
      },
        React.createElement('img', {
          src: `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(lightningUrl)}`,
          alt: 'Invoice QR Code',
          width: 300,
          height: 300,
          style: {
            border: '1px solid #ccc',
            borderRadius: '4px'
          }
        }),
        React.createElement('img', {
          src: '/Resources/img/lightning-bolt.svg',
          alt: 'Lightning',
          style: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px',
            height: '60px',
            padding: '10px',
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }
        }),
        // Overlay for copy click functionality
        React.createElement('div', {
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'pointer'
          },
          onClick: () => {
            navigator.clipboard.writeText(result.data.invoice);
            alert('Invoice copied to clipboard!');
          }
        })
      ),
      
      // Text input for the invoice with copy button
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
      
      // Open in wallet button
      React.createElement('a', {
        href: lightningUrl,
        className: 'btn btn-primary mb-3',
        target: '_blank',
        rel: 'noopener noreferrer'
      }, 'Open in Lightning Wallet')
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
  
  // Show raw JSON of order data (only in debug mode or for developers)
  const renderRawJson = () => {
    const dataToShow = result.success ? result.data : result.error;
    
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('details', null,
        React.createElement('summary', { className: 'text-muted small' }, 'Technical Details'),
        React.createElement('pre', { className: 'mt-2 p-2 bg-light border rounded small' },
          JSON.stringify(result.success ? result.data : { error: result.error }, null, 2)
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
    renderRawJson()
  );
};