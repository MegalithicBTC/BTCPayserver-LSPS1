// Channel Order Manager - Handles channel order creation and tracking
window.ChannelOrderManager = {
  lspInfo: null,
  options: null,
  pollingInterval: null,
  orderPollingInterval: null,
  lspUrl: null,
  nodePublicKey: null,
  
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
    
    // Process options if LspManager is available
    if (window.LspManager && typeof window.LspManager.processChannelOptions === 'function') {
      this.options = window.LspManager.processChannelOptions(lspInfo);
    } else {
      console.warn("LspManager not available, cannot process channel options");
      // Create basic options from lspInfo directly
      this.options = {
        minChannelSizeSat: lspInfo.min_initial_client_balance_sat || "0",
        maxChannelSizeSat: lspInfo.max_initial_client_balance_sat || "16777215"
      };
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
    if (!orderId || !this.lspUrl) {
      console.error("Cannot poll order status - missing required data");
      return false;
    }
    
    // Clear any existing polling interval
    if (this.orderPollingInterval) {
      clearInterval(this.orderPollingInterval);
    }
    
    // Set up polling interval
    this.orderPollingInterval = setInterval(async () => {
      try {
        if (window.LspApiService && typeof window.LspApiService.getOrderStatus === 'function') {
          const status = await window.LspApiService.getOrderStatus(orderId);
          console.log("Order status update:", status);
          
          // If we have a complete or failed state, stop polling
          if (status.status === 'complete' || status.status === 'failed') {
            clearInterval(this.orderPollingInterval);
            this.orderPollingInterval = null;
          }
          
          // Dispatch a custom event with the status for other components to listen to
          window.dispatchEvent(new CustomEvent('lsps1:order-status-update', { detail: status }));
        } else {
          console.error("LspApiService not available for status polling");
          clearInterval(this.orderPollingInterval);
          this.orderPollingInterval = null;
        }
      } catch (error) {
        console.error("Error polling order status:", error);
      }
    }, 5000); // Poll every 5 seconds
    
    return true;
  }
};