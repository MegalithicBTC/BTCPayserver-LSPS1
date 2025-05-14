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

  // Render the payment information section based on what's available
  const renderPaymentInfo = () => {
    if (!result.success || !statusData || !statusData.paymentInfo) {
      // Only show invoice from the initial result if we haven't received status updates
      if (result.success && result.data && result.data.invoice) {
        return renderInvoice(result.data.invoice);
      }
      return null;
    }
    
    const paymentInfo = statusData.paymentInfo;
    
    // Only handle Lightning payments
    if (paymentInfo.type === 'lightning' && paymentInfo.invoice) {
      return renderInvoice(paymentInfo.invoice);
    }
    
    return null;
  };
  
  // Render Lightning invoice
  const renderInvoice = (invoice) => {
    // Generate lightning: URL for the invoice
    const lightningUrl = `lightning:${invoice}`;
    
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
            navigator.clipboard.writeText(invoice);
            alert('Invoice copied to clipboard!');
          }
        })
      ),
      
      // Text input for the invoice with copy button
      React.createElement('div', { className: 'input-group mb-3' },
        React.createElement('input', {
          type: 'text',
          className: 'form-control',
          value: invoice,
          readOnly: true
        }),
        React.createElement('button', {
          className: 'btn btn-outline-secondary',
          type: 'button',
          onClick: () => {
            navigator.clipboard.writeText(invoice);
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
    let statusDetails = null;
    
    if (statusData.status === 'complete' || statusData.status === 'completed') {
      statusMessage = 'Channel successfully created!';
      statusClass = 'text-success';
      
      // Add channel details if available
      if (statusData.channelInfo && statusData.channelInfo.fundingOutpoint) {
        statusDetails = React.createElement('div', { className: 'mt-2' },
          React.createElement('p', { className: 'mb-1' }, `Channel funding transaction: ${statusData.channelInfo.fundingOutpoint}`),
          React.createElement('p', { className: 'mb-0' }, `Expires: ${new Date(statusData.channelInfo.expiresAt).toLocaleString()}`)
        );
      }
    } else if (statusData.status === 'failed') {
      statusMessage = statusData.errorMessage || 'Channel creation failed';
      statusClass = 'text-danger';
      
      // Add refund details if available
      if (statusData.paymentInfo && statusData.paymentInfo.refundReason) {
        statusDetails = React.createElement('p', { className: 'mt-2 mb-0' }, statusData.paymentInfo.refundReason);
      }
    } else if (statusData.status === 'waiting_for_payment') {
      statusMessage = 'Waiting for invoice payment...';
      statusClass = 'text-warning';
      
      // Add expiry if available
      if (statusData.paymentInfo && statusData.paymentInfo.expiresAt) {
        const expiryDate = new Date(statusData.paymentInfo.expiresAt);
        statusDetails = React.createElement('p', { className: 'mt-2 mb-0' }, 
          `Expires: ${expiryDate.toLocaleString()}`
        );
      }
    } else if (statusData.status === 'payment_received') {
      statusMessage = 'Payment received, waiting for channel creation...';
      statusClass = 'text-info';
    } else if (statusData.status === 'timeout') {
      statusMessage = 'Status check timed out. The channel may still be created.';
      statusClass = 'text-warning';
      statusDetails = React.createElement('p', { className: 'mt-2 mb-0' }, 
        'Please check your node for new channels or try again later.'
      );
    }
    
    return React.createElement('div', { className: `alert ${statusClass === 'text-success' ? 'alert-success' : statusClass === 'text-danger' ? 'alert-danger' : statusClass === 'text-warning' ? 'alert-warning' : 'alert-info'} mt-3` },
      React.createElement('h5', null, 'Order Status:'),
      React.createElement('p', { className: statusDetails ? 'mb-2' : 'mb-0' }, statusMessage),
      statusDetails
    );
  };
  
  // Show raw JSON of order data (only in debug mode or for developers)
  const renderRawJson = () => {
    const dataToShow = orderStatus || (result.success ? result.data : { error: result.error });
    
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('details', null,
        React.createElement('summary', { className: 'text-muted small' }, 'Technical Details'),
        React.createElement('pre', { className: 'mt-2 p-2 bg-light border rounded small' },
          JSON.stringify(dataToShow, null, 2)
        )
      )
    );
  };
  
  // More descriptive error message
  const getErrorMessage = () => {
    if (!result.error) return "Unknown error";
    
    if (typeof result.error === 'string') {
      return result.error;
    }
    
    if (result.error.message) {
      return result.error.message;
    }
    
    return JSON.stringify(result.error);
  };
  
  return React.createElement('div', { className: `alert ${alertClass}` },
    React.createElement('h4', null, result.success ? 'Channel Order Created' : 'Error Creating Channel Order'),
    React.createElement('p', null, result.success ? 
      'Your channel order has been created. Please pay the invoice below.' : 
      `Error: ${getErrorMessage()}`
    ),
    renderPaymentInfo(),
    renderStatus(),
    renderRawJson()
  );
};