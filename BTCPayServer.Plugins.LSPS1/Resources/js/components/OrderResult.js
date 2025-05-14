// OrderResult component - Shows results of a channel order
window.OrderResult = function(resultProps) {
  const { result } = resultProps;
  
  // Create state to store the latest order status updates
  const [orderStatus, setOrderStatus] = React.useState(null);
  const [lastPolled, setLastPolled] = React.useState(new Date());
  const [pollingActive, setPollingActive] = React.useState(false);
  
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
      setLastPolled(new Date());
    };
    
    document.addEventListener('order-status-updated', handleStatusUpdate);
    
    // Start polling for order status if we have a successful result with an orderId
    if (result.success && result.data && result.data.order_id) {
      console.log("Starting order status polling for order:", result.data.order_id);
      if (window.ChannelOrderManager && typeof window.ChannelOrderManager.startOrderStatusPolling === 'function') {
        window.ChannelOrderManager.startOrderStatusPolling(result.data.order_id);
        setPollingActive(true);
      }
    }
    
    return () => {
      document.removeEventListener('order-status-updated', handleStatusUpdate);
      // Clean up polling when component unmounts
      if (pollingActive && window.ChannelOrderManager && typeof window.ChannelOrderManager.stopOrderStatusPolling === 'function') {
        window.ChannelOrderManager.stopOrderStatusPolling();
      }
    };
  }, [result]);
  
  // Determine appropriate alert class based on result
  const alertClass = result.success ? 'alert-success' : 'alert-danger';
  
  // Get the most current status data
  const statusData = orderStatus || (result.success ? result.data : null);

  // Get the payment information for rendering
  const renderPaymentInfo = () => {
    if (!result.success || !statusData) {
      return null;
    }
    
    // Check for payment info from order status updates first
    if (statusData.paymentInfo && statusData.paymentInfo.type === 'lightning' && statusData.paymentInfo.invoice) {
      return window.OrderResultInvoice.renderInvoice(statusData.paymentInfo.invoice);
    }
    
    // For initial order response, check standard LSPS1 response format
    if (statusData.payment && statusData.payment.bolt11 && statusData.payment.bolt11.invoice) {
      return window.OrderResultInvoice.renderInvoice(statusData.payment.bolt11.invoice);
    }
    
    // Fallback for any invoice field
    if (statusData.invoice) {
      return window.OrderResultInvoice.renderInvoice(statusData.invoice);
    }
    
    return null;
  };
  
  return React.createElement('div', { className: `alert ${alertClass}` },
    React.createElement('h4', null, result.success ? 'Channel Order Created' : 'Error Creating Channel Order'),
    React.createElement('p', null, result.success ? 
      'Your channel order has been created. Please pay the invoice below.' : 
      `Error: ${window.OrderResultStatus.getErrorMessage(result.error)}`
    ),
    renderPaymentInfo(),
    window.OrderResultStatus.renderStatus(statusData, lastPolled),
    window.OrderResultStatus.renderRawJson(orderStatus || (result.success ? result.data : { error: result.error }))
  );
};