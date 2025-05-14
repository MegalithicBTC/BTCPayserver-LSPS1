// Channel Order Manager - Handles channel order creation and tracking
window.ChannelOrderManager = {
  lspInfo: null,
  options: null,
  lspUrl: null,
  nodePublicKey: null,
  orderPollingInterval: null,
  currentOrderId: null,
  
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
    
    this.lspInfo = lspInfo;
    this.lspUrl = lspUrl;
    this.nodePublicKey = nodePublicKey;
    
    // Process options if LspConfigManager is available
    if (window.LspConfigManager && typeof window.LspConfigManager.processChannelOptions === 'function') {
      this.options = window.LspConfigManager.processChannelOptions(lspInfo);
    } 
    
    // If options processing failed or returned null, create our own options object directly from lspInfo
    if (!this.options) {
      console.warn("Creating basic channel options from lspInfo directly");
      this.options = {
        minChannelSize: parseInt(lspInfo.min_initial_client_balance_sat || lspInfo.min_channel_balance || 100000, 10),
        maxChannelSize: parseInt(lspInfo.max_initial_client_balance_sat || lspInfo.max_channel_balance || 16777215, 10),
        defaultChannelSize: parseInt(lspInfo.recommended_channel_balance || 1000000, 10),
        feeRatePercent: parseFloat(lspInfo.channel_fee_rate ? lspInfo.channel_fee_rate / 1000000 : 0.001),
        minSats: parseInt(lspInfo.min_initial_client_balance_sat || lspInfo.min_channel_balance || 100000, 10),
        maxSats: parseInt(lspInfo.max_initial_client_balance_sat || lspInfo.max_channel_balance || 16777215, 10)
      };
      
      // Ensure default size is within min/max bounds
      this.options.defaultChannelSize = Math.min(
        Math.max(this.options.defaultChannelSize, this.options.minChannelSize), 
        this.options.maxChannelSize
      );
    }
    
    // Make sure the options include minSats and maxSats properties that the slider component expects
    if (this.options && !this.options.minSats) {
      this.options.minSats = this.options.minChannelSize;
    }
    if (this.options && !this.options.maxSats) {
      this.options.maxSats = this.options.maxChannelSize;
    }
    
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
        return await window.LspApiService.createOrder(this.nodePublicKey, channelSize, isPrivate);
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
    
    // Clear any existing polling interval
    this.stopOrderStatusPolling();
    
    // Do an initial check immediately
    this.checkOrderStatus(orderId);
    
    console.log(`Starting order status polling for orderId: ${orderId}`);
    this.orderPollingInterval = setInterval(() => {
      this.checkOrderStatus(orderId);
    }, 5000); // Poll every 5 seconds
    
    return true;
  },
  
  // Stop polling for order status
  stopOrderStatusPolling() {
    if (this.orderPollingInterval) {
      console.log("Stopping order status polling");
      clearInterval(this.orderPollingInterval);
      this.orderPollingInterval = null;
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