// OrderResultStatus.js - Utilities for rendering order status information
window.OrderResultStatus = {
  /**
   * Renders the status section of an order
   * @param {Object} statusData - The order status data
   * @param {Date} lastPolled - Timestamp of last status check
   * @returns {React.Element} - React element with the rendered status
   */
  renderStatus: function(statusData, lastPolled) {
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
    } else if (statusData.status === 'waiting_for_payment' || 
              (statusData.order_state && statusData.order_state.toUpperCase() === 'CREATED')) {
      statusMessage = 'Waiting for invoice payment...';
      statusClass = 'text-warning';
      
      // Add expiry if available from different sources
      let expiryDate = null;
      if (statusData.paymentInfo && statusData.paymentInfo.expiresAt) {
        expiryDate = new Date(statusData.paymentInfo.expiresAt);
      } else if (statusData.payment && statusData.payment.bolt11 && statusData.payment.bolt11.expires_at) {
        expiryDate = new Date(statusData.payment.bolt11.expires_at);
      }
      
      if (expiryDate) {
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
    } else if (statusData.order_state) {
      // Fallback to raw order state if status is not mapped
      statusMessage = `Order status: ${statusData.order_state}`;
      statusClass = 'text-info';
    }
    
    return React.createElement('div', { className: `alert ${statusClass === 'text-success' ? 'alert-success' : statusClass === 'text-danger' ? 'alert-danger' : statusClass === 'text-warning' ? 'alert-warning' : 'alert-info'} mt-3` },
      React.createElement('h5', null, 'Order Status:'),
      React.createElement('p', { className: statusDetails ? 'mb-2' : 'mb-0' }, statusMessage),
      statusDetails,
      React.createElement('p', { className: 'mt-2 text-muted small' },
        `Last status check: ${lastPolled.toLocaleTimeString()}`
      )
    );
  },
  
  /**
   * Renders technical details as a collapsible section
   * @param {Object} data - The data to show in raw format
   * @returns {React.Element} - React element with collapsible details
   */
  renderRawJson: function(data) {
    return React.createElement('div', { className: 'mt-3' },
      React.createElement('details', null,
        React.createElement('summary', { className: 'small' }, 'Technical Details'),
        React.createElement('pre', { className: 'mt-2 p-2 bg-light border rounded small' },
          JSON.stringify(data, null, 2)
        )
      )
    );
  },
  
  /**
   * Creates a more user-friendly error message
   * @param {string|Object} error - Error information
   * @returns {string} - Formatted error message
   */
  getErrorMessage: function(error) {
    if (!error) return "Unknown error";
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return JSON.stringify(error);
  }
};