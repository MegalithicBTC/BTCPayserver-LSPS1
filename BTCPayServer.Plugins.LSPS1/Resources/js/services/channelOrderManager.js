// Channel Order Manager - Handles channel order creation and tracking
window.ChannelOrderManager = {
  lspInfo: null,
  options: null,
  lspUrl: null,
  nodePublicKey: null,
  orderPollingInterval: null,
  currentOrderId: null,
  invoicePaymentTimeout: null,
  
  init(lspInfo, lspUrl, nodePublicKey) {
    if (!lspInfo) {
      console.error("ChannelOrderManager init failed: lspInfo is required");
      return false;
    }
    
    if (!lspUrl) {
      console.error("ChannelOrderManager init failed: lspUrl is required");
      return false;
    }
    
    if (!nodePublicKey) {
      console.error("ChannelOrderManager init failed: nodePublicKey is required");
      return false;
    }
    
    // Store LSP and node info for order creation
    this.lspInfo = lspInfo;
    this.lspUrl = lspUrl;
    this.nodePublicKey = nodePublicKey;
    
    // Set up default options
    this.options = {
      lsp_id: lspInfo.id || '',
      lsp_fee_amount: 0,
      channel_expiry: 1008, // Default expiry in blocks (approximately 1 week)
      announce_channel: true // Default to public channels
    };
    
    // Process options if LspConfigManager is available
    if (window.LspConfigManager && typeof window.LspConfigManager.processChannelOptions === 'function') {
      const processedOptions = window.LspConfigManager.processChannelOptions(lspInfo);
      if (processedOptions) {
        this.options = processedOptions;
        
        // Ensure processed options have minSats and maxSats for the slider
        if (!this.options.minSats && this.options.minChannelSize) {
          this.options.minSats = this.options.minChannelSize;
        }
        
        if (!this.options.maxSats && this.options.maxChannelSize) {
          this.options.maxSats = this.options.maxChannelSize;
        }
      }
    } 
    
    // If options processing failed or returned null, create our own options object directly from lspInfo
    if (!this.options || (!this.options.minSats && !this.options.maxSats)) {
      console.warn("Creating basic channel options from lspInfo directly");
      
      // Camel case keys from snake case for consistency
      const min_initial_client = parseInt(lspInfo.min_initial_client_balance_sat || lspInfo.minInitialClientBalanceSat || 0, 10);
      const max_initial_client = parseInt(lspInfo.max_initial_client_balance_sat || lspInfo.maxInitialClientBalanceSat || 0, 10);
      
      // If client balance is 0, use LSP balance
      const min_lsp = parseInt(lspInfo.min_initial_lsp_balance_sat || lspInfo.minInitialLspBalanceSat || 150000, 10);
      const max_lsp = parseInt(lspInfo.max_initial_lsp_balance_sat || lspInfo.maxInitialLspBalanceSat || 16000000, 10);
      
      // Get the values (with LSP balance as fallback if client balance is 0)
      const minSats = min_initial_client > 0 ? min_initial_client : min_lsp;
      const maxSats = max_initial_client > 0 ? max_initial_client : max_lsp;
      
      this.options = {
        minChannelSize: minSats,
        maxChannelSize: maxSats,
        defaultChannelSize: parseInt(lspInfo.recommended_channel_balance || lspInfo.recommendedChannelBalance || 1000000, 10),
        feeRatePercent: parseFloat(lspInfo.channel_fee_rate ? lspInfo.channel_fee_rate / 1000000 : 0.001),
        minSats: minSats,
        maxSats: maxSats
      };
      
      // Ensure default size is within min/max bounds
      this.options.defaultChannelSize = Math.min(
        Math.max(this.options.defaultChannelSize, this.options.minChannelSize), 
        this.options.maxChannelSize
      );
    }
    
    // Ensure we have these essential properties for the slider component
    if (!this.options.minSats) {
      this.options.minSats = this.options.minChannelSize || 150000;
    }
    if (!this.options.maxSats) {
      this.options.maxSats = this.options.maxChannelSize || 16000000;
    }
    
    // Make sure we actually have values that make sense
    if (this.options.minSats <= 0) this.options.minSats = 150000;
    if (this.options.maxSats <= 0 || this.options.maxSats < this.options.minSats) this.options.maxSats = 16000000;
    
    // Initialize the LSP API Service with the LSP URL if available
    if (window.LspApiService && typeof window.LspApiService.init === 'function') {
      window.LspApiService.init(lspUrl);
    } else {
      console.warn("LspApiService not available, some functionality may be limited");
    }
    
    console.log("Channel Order Manager initialized with:", {
      options: this.options,
      lspUrl: this.lspUrl,
      nodePublicKey: this.nodePublicKey
    });
    
    return true;
  },
  
  // Create an order with the specified channel size
  async createOrder(channelSize, isPrivate = false) {
    if (!this.nodePublicKey || !this.lspUrl) {
      console.error("Cannot create order - missing required configuration");
      return { success: false, error: "Channel manager not properly configured" };
    }
    
    try {
      console.log(`Creating channel order: ${channelSize} sats, private: ${isPrivate}`);
      
      // Try to use LspApiService if available
      if (window.LspApiService && typeof window.LspApiService.createOrder === 'function') {
        const response = await window.LspApiService.createOrder(this.nodePublicKey, channelSize, isPrivate);
        
        if (response.success && response.data) {
          // Extract invoice and order details from the response
          const orderId = response.data.order_id;
          let invoice = null;
          let paymentInfo = null;
          
          // Try to find the invoice in the response
          if (response.data.payment && response.data.payment.bolt11) {
            const bolt11Data = response.data.payment.bolt11;
            invoice = bolt11Data.invoice;
            paymentInfo = {
              type: 'lightning',
              state: bolt11Data.state,
              expiresAt: bolt11Data.expires_at,
              invoice: bolt11Data.invoice,
              feeSats: bolt11Data.fee_total_sat,
              totalSats: bolt11Data.order_total_sat
            };
          }
          
          // Start polling if we have an order ID
          if (orderId) {
            this.startOrderStatusPolling(orderId);
          }
          
          return {
            success: true,
            orderId,
            status: 'waiting_for_payment',
            message: 'Order created successfully.',
            paymentInfo,
            data: response.data
          };
        }
        
        return response;
      } else {
        console.error("LspApiService not available for order creation");
        return { success: false, error: "Channel order service not available" };
      }
    } catch (error) {
      console.error("Error creating channel order:", error);
      return { success: false, error: error.message || "Unknown error creating channel" };
    }
  },
  
  // Poll for order status directly from the LSP
  startOrderStatusPolling(orderId) {
    if (!orderId) {
      console.error("Cannot start polling: Order ID is required");
      return false;
    }
    
    // Store the current order ID for reference
    this.currentOrderId = orderId;
    
    // Clear any existing polling interval and timeout
    this.stopOrderStatusPolling();
    
    // Do an initial check immediately
    this.checkOrderStatus(orderId);
    
    console.log(`Starting order status polling for orderId: ${orderId}`);
    this.orderPollingInterval = setInterval(() => {
      this.checkOrderStatus(orderId);
    }, 5000); // Poll every 5 seconds
    
    // Set a timeout for invoice payment
    // TODO: Set this to 10 minutes (600000 ms) for production
    const timeoutDuration = 10000; // 10 seconds for testing
    console.log(`Setting invoice payment timeout to ${timeoutDuration}ms (TODO: change to 10 minutes in production)`);
    
    this.invoicePaymentTimeout = setTimeout(() => {
      this.handleInvoiceTimeout(orderId);
    }, timeoutDuration);
    
    return true;
  },
  
  // Handle invoice payment timeout
  handleInvoiceTimeout(orderId) {
    console.log(`Invoice payment timeout reached for order ${orderId}`);
    
    // Stop the polling
    this.stopOrderStatusPolling();
    
    // Dispatch a timeout event for UI components
    document.dispatchEvent(new CustomEvent('invoice-payment-timeout', { 
      detail: { orderId, message: "Invoice payment timed out" }
    }));
  },
  
  // Stop polling for order status
  stopOrderStatusPolling() {
    if (this.orderPollingInterval) {
      console.log("Stopping order status polling");
      clearInterval(this.orderPollingInterval);
      this.orderPollingInterval = null;
    }
    
    // Clear any invoice payment timeout
    if (this.invoicePaymentTimeout) {
      console.log("Clearing invoice payment timeout");
      clearTimeout(this.invoicePaymentTimeout);
      this.invoicePaymentTimeout = null;
    }
    
    // Also stop channel polling if we were polling
    if (window.ChannelManager && typeof window.ChannelManager.stopChannelPolling === 'function') {
      window.ChannelManager.stopChannelPolling();
    }
  },
  
  // Check the status of an order
  async checkOrderStatus(orderId) {
    if (!orderId) {
      console.error("Order ID is required for status check");
      return { success: false, error: "Missing order ID" };
    }
    
    try {
      console.log(`Checking status for order ${orderId} at ${new Date().toLocaleTimeString()}`);
      
      // Try to use LspApiService if available
      if (window.LspApiService && typeof window.LspApiService.getOrderStatus === 'function') {
        const status = await window.LspApiService.getOrderStatus(orderId);
        
        // Update any OrderResult components via static method
        if (window.OrderResult && typeof window.OrderResult.updateStatus === 'function') {
          console.log("Updating OrderResult with status:", status);
          window.OrderResult.updateStatus(status);
        } else {
          console.log("Order status received but OrderResult.updateStatus not available:", status);
          // Dispatch a custom event as fallback
          document.dispatchEvent(new CustomEvent('order-status-updated', { detail: status }));
        }
        
        // Automatically stop polling if the order is complete or failed
        if (status.success && 
            (status.status === 'complete' || 
             status.status === 'completed' || 
             status.status === 'failed')) {
          console.log(`Order ${orderId} reached final state (${status.status}), stopping polling`);
          this.stopOrderStatusPolling();
        }
        
        // If payment is received, clear the invoice payment timeout
        if (status.success && 
            (status.status === 'payment_received' || 
             status.payment?.bolt11?.state === 'HOLD')) {
          console.log("Payment received, clearing invoice payment timeout");
          if (this.invoicePaymentTimeout) {
            clearTimeout(this.invoicePaymentTimeout);
            this.invoicePaymentTimeout = null;
          }
        }
        
        return status;
      } else {
        console.error("LspApiService not available for status polling");
        this.stopOrderStatusPolling();
        return { success: false, error: "Order status service not available" };
      }
    } catch (error) {
      console.error("Error checking order status:", error);
      return { success: false, error: error.message || "Unknown error checking order status" };
    }
  }
};