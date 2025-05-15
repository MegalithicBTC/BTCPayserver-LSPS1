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
    let invoiceElement = null;
    
    // Check order states
    const isCompleted = statusData.order_state === "COMPLETED" || 
                       statusData.status === "complete" || 
                       statusData.status === "completed";
                       
    const isFailed = statusData.order_state === "FAILED" ||
                    statusData.status === "failed";

    if (isFailed) {
      statusMessage = `Invoice payment failed because the LSP encountered and error when trying to open the channel. Contact ${window.LSPS1App?.props?.connectedLspName || "the LSP"} for support.`;
      statusClass = 'text-danger';
      
      statusDetails = React.createElement('div', { className: 'mt-3' },
        React.createElement('pre', { 
          className: 'bg-light p-3 rounded small',
          style: { maxHeight: '400px', overflow: 'auto' }
        }, 
          JSON.stringify(statusData, null, 2)
        ),
        React.createElement('div', { className: 'mt-3 text-center' },
          React.createElement('button', {
            className: 'btn btn-primary',
            onClick: () => window.location.reload()
          }, 'Try Again')
        )
      );
    } else if (isCompleted) {
      statusMessage = 'Your channel is opening!';
      statusClass = 'text-success';
      
      // Show channel details if available
      if (statusData.channelInfo && statusData.channelInfo.fundingOutpoint) {
        const txid = statusData.channelInfo.fundingOutpoint.split(':')[0];
        const vout = statusData.channelInfo.fundingOutpoint.split(':')[1] || '0';
        
        // Determine if we're on mainnet or testnet based on URL or configuration
        const isMainnet = window.LSPS1App?.props?.lspUrl?.includes('megalithic.me') || 
                         !window.LSPS1App?.props?.lspUrl?.includes('mutiny');
        
        // Create mempool.space URL for the transaction
        const mempoolBaseUrl = isMainnet 
          ? 'https://mempool.space' 
          : 'https://mutinynet.mempool.space';
        
        const mempoolUrl = `${mempoolBaseUrl}/tx/${txid}#vout=${vout}`;
        
        statusDetails = React.createElement('div', { className: 'mt-3' },
          React.createElement('p', { className: 'mb-2' }, 
            'Your channel funding transaction has been broadcast to the network!'
          ),
          React.createElement('div', { className: 'd-grid gap-2 mb-3' },
            React.createElement('a', { 
              className: 'btn btn-primary', 
              href: mempoolUrl,
              target: '_blank',
              rel: 'noopener noreferrer'
            }, 'See on mempool.space')
          ),
          React.createElement('div', { 
            className: 'alert alert-info mb-0',
            role: 'alert'
          }, 
            React.createElement('i', { className: 'bi bi-info-circle me-2' }),
            'Please expect your channel will be open and able to receive payments after 3 to 6 block confirmations.'
          )
        );
      }

      // Show raw channel data from polling if there's no fundingOutpoint
      else if (statusData.channelData && statusData.channelData.length > 0) {
        statusDetails = React.createElement('div', { className: 'mt-3' },
          React.createElement('h6', null, 'Channel Details:'),
          React.createElement('pre', { 
            className: 'bg-light p-3 rounded small',
            style: { maxHeight: '400px', overflow: 'auto' }
          }, 
            JSON.stringify(statusData.channelData, null, 2)
          )
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
      
      // Only show invoice if not completed
      let invoice = null;
      
      // Try to find the invoice in various places in the response
      if (statusData.paymentInfo && statusData.paymentInfo.invoice) {
        invoice = statusData.paymentInfo.invoice;
      } else if (statusData.details && statusData.details.payment && 
                statusData.details.payment.bolt11 && 
                statusData.details.payment.bolt11.invoice) {
        invoice = statusData.details.payment.bolt11.invoice;
      } else if (statusData.payment && statusData.payment.bolt11 && 
                statusData.payment.bolt11.invoice) {
        invoice = statusData.payment.bolt11.invoice;
      } else if (statusData.data && statusData.data.payment && 
                statusData.data.payment.bolt11 && 
                statusData.data.payment.bolt11.invoice) {
        invoice = statusData.data.payment.bolt11.invoice;
      }
      
      // Only render invoice element if not completed
      if (invoice && !isCompleted && window.OrderResultInvoice) {
        console.log(`Found invoice to display: ${invoice.substring(0, 20)}...`);
        invoiceElement = window.OrderResultInvoice.renderInvoice(invoice, statusData);
      } else if (invoice) {
        // Fallback if OrderResultInvoice is not available
        console.log("OrderResultInvoice component not available, using fallback");
        invoiceElement = React.createElement('div', { className: 'mt-3 p-3 border rounded bg-light' },
          React.createElement('p', { className: 'mb-2' }, 'Please pay this Lightning invoice:'),
          React.createElement('div', { className: 'input-group mb-3' },
            React.createElement('input', {
              type: 'text',
              className: 'form-control',
              value: invoice,
              readOnly: true,
              onClick: (e) => e.target.select()
            }),
            React.createElement('button', {
              className: 'btn btn-outline-secondary',
              type: 'button',
              onClick: () => {
                navigator.clipboard.writeText(invoice)
                  .then(() => alert('Invoice copied to clipboard'))
                  .catch(err => console.error('Failed to copy invoice:', err));
              }
            }, 'Copy')
          ),
          React.createElement('p', { className: 'mb-0 small' }, 
            React.createElement('a', { 
              href: `lightning:${invoice}`,
              className: 'text-decoration-none'
            }, 'Open in Lightning wallet')
          )
        );
      } else {
        console.warn("No invoice found in status data:", statusData);
      }
    } else if (statusData.status === 'payment_received' || 
              (statusData.payment?.bolt11?.state === 'HOLD')) {
      statusMessage = 'Payment received, channel opening in progress...';
      statusClass = 'text-info';
    }
    
    return React.createElement('div', { className: `alert ${statusClass === 'text-success' ? 'alert-success' : statusClass === 'text-danger' ? 'alert-danger' : statusClass === 'text-warning' ? 'alert-warning' : 'alert-info'} mt-3` },
      React.createElement('div', { className: 'd-flex justify-content-between align-items-start' },
        React.createElement('div', null,
          React.createElement('p', { className: statusDetails ? 'mb-2' : 'mb-0' }, statusMessage)
        ),
        !isFailed && React.createElement('button', {
          className: 'btn btn-sm btn-outline-secondary',
          onClick: () => {
            const detailsSection = document.getElementById('technical-details');
            if (detailsSection) {
              detailsSection.style.display = detailsSection.style.display === 'none' ? 'block' : 'none';
            }
          }
        }, 'Technical Details')
      ),
      statusDetails,
      // Only show invoice if not completed and not failed
      !isCompleted && !isFailed && invoiceElement,
      !isFailed && React.createElement('div', { 
        id: 'technical-details',
        className: 'mt-3',
        style: { display: 'none' }
      },
        React.createElement('pre', { 
          className: 'bg-light p-3 rounded small',
          style: { maxHeight: '400px', overflow: 'auto' }
        }, 
          JSON.stringify({
            orderStatus: statusData,
            lastPolled: lastPolled.toISOString()
          }, null, 2)
        )
      ),
      !isFailed && React.createElement('p', { className: 'mt-2 text-muted small' },
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