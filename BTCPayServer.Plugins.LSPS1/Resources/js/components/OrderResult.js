// OrderResult component - Shows results of a channel order
window.OrderResult = function(resultProps) {
  const { result } = resultProps;
  
  // Create state to store the latest order status updates and channel data
  const [orderStatus, setOrderStatus] = React.useState(null);
  const [lastPolled, setLastPolled] = React.useState(new Date());
  const [channelData, setChannelData] = React.useState([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);
  
  // Effect to listen for status updates
  React.useEffect(() => {
    const handleStatusUpdate = (event) => {
      console.log("Order status update received:", event.detail);
      setOrderStatus(event.detail);
      setLastPolled(new Date());
    };
    
    document.addEventListener('order-status-updated', handleStatusUpdate);
    
    // Listen for channel update events from ChannelManager
    const handleChannelsUpdated = (event) => {
      console.log("Channels updated in OrderResult:", event.detail);
      setChannelData(event.detail);
    };
    
    document.addEventListener('channels-updated', handleChannelsUpdated);
    
    // Start polling for order status if we have a successful result with an orderId
    if (result.success && result.orderId) {
      console.log("Starting order status polling for order:", result.orderId);
      if (window.ChannelOrderManager && typeof window.ChannelOrderManager.startOrderStatusPolling === 'function') {
        window.ChannelOrderManager.startOrderStatusPolling(result.orderId);
      }
    }
    
    return () => {
      document.removeEventListener('order-status-updated', handleStatusUpdate);
      document.removeEventListener('channels-updated', handleChannelsUpdated);
    };
  }, [result]);
  
  // Get the most current status data
  const currentStatusData = React.useMemo(() => {
    if (!orderStatus && !result) return null;
    
    // If we have orderStatus, merge it with channel data
    if (orderStatus) {
      return {
        ...orderStatus,
        channelData: channelData.length > 0 ? channelData : null,
        paymentInfo: orderStatus.paymentInfo || result.paymentInfo,
        data: orderStatus.data || result.data
      };
    }
    
    // Otherwise just use the initial result
    return result;
  }, [orderStatus, result, channelData]);
  
  // Determine appropriate alert class based on result and status
  const alertClass = React.useMemo(() => {
    if (!result.success) return 'alert-danger';
    
    // Check if order is completed
    const isCompleted = currentStatusData?.order_state === "COMPLETED" || 
                       currentStatusData?.status === "complete" || 
                       currentStatusData?.status === "completed";
                       
    if (isCompleted) return 'alert-success';
    if (currentStatusData?.status === 'failed') return 'alert-danger';
    if (currentStatusData?.status === 'waiting_for_payment') return 'alert-warning';
    return 'alert-info';
  }, [result.success, currentStatusData]);
  
  return React.createElement('div', { className: `alert ${alertClass}` },
    React.createElement('div', { className: 'd-flex justify-content-between align-items-start' },
      React.createElement('div', null,
        React.createElement('h5', { className: 'alert-heading' }, 
          result.success ? 'Success!' : 'Error'
        ),
        React.createElement('p', { className: 'mb-0' }, 
          result.message || (result.success ? 'Order created successfully.' : 'Failed to create order.')
        )
      )
    ),
    
    // Show status if we have data
    currentStatusData && window.OrderResultStatus ? 
      window.OrderResultStatus.renderStatus(currentStatusData, lastPolled) : null
  );
};

// Add static updateStatus method
window.OrderResult.updateStatus = function(status) {
  document.dispatchEvent(new CustomEvent('order-status-updated', { detail: status }));
};