// Channel Order Manager - Handles channel order creation and tracking
window.ChannelOrderManager = {
  lspInfo: null,
  options: null,
  pollingInterval: null,
  orderPollingInterval: null,
  
  init(lspInfo, lspUrl, nodePublicKey) {
    this.lspInfo = lspInfo;
    this.options = window.LspManager?.processChannelOptions(lspInfo);
    this.nodePublicKey = nodePublicKey;
    
    // Initialize the LSP API Service with the LSP URL
    window.LspApiService.init(lspUrl);
    
    console.log("Channel Order Manager initialized with:", {
      options: this.options,
      lspUrl,
      nodePublicKey
    });
  },
  
  // Create an order with the specified channel size
  async createOrder(channelSize, isPrivate = false) {
    if (!this.nodePublicKey) {
      console.error("Node public key is required for creating an order");
      return { success: false, error: "Lightning node public key not available" };
    }
    
    try {
      console.log(`Creating channel order for ${channelSize} sats, private: ${isPrivate}`);
      
      // Call the LSP API service directly
      const result = await window.LspApiService.createOrder(
        this.nodePublicKey, 
        channelSize, 
        isPrivate
      );
      
      console.log("Order creation result:", result);
      
      // If we have a successful order with an order_id, start polling
      if (result.success && result.data && result.data.order_id) {
        this.startOrderStatusPolling(result.data.order_id);
      }
      
      return result;
    } catch (error) {
      console.error("Error creating channel order:", error);
      return {
        success: false,
        error: error.message || "Failed to create channel order"
      };
    }
  },
  
  // Poll for order status directly from the LSP
  startOrderStatusPolling(orderId) {
    if (this.orderPollingInterval) {
      clearInterval(this.orderPollingInterval);
    }
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes at 5-second intervals
    
    this.orderPollingInterval = setInterval(async () => {
      try {
        // Use the LSP API service to check order status directly
        const result = await window.LspApiService.getOrderStatus(orderId);
        console.log("Order status poll result:", result);
        
        // Update UI with order status
        if (window.OrderResult && typeof window.OrderResult.updateStatus === 'function') {
          window.OrderResult.updateStatus(result);
        }
        
        // If order is complete or failed, stop polling
        if (result.status === 'complete' || result.status === 'failed') {
          clearInterval(this.orderPollingInterval);
          
          // If complete, trigger a channel list refresh
          if (result.status === 'complete') {
            await window.ChannelManager.refreshChannels();
          }
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          console.log("Order status polling timed out");
          clearInterval(this.orderPollingInterval);
        }
      } catch (error) {
        console.error("Error polling order status:", error);
      }
    }, 5000); // Poll every 5 seconds
  }
};