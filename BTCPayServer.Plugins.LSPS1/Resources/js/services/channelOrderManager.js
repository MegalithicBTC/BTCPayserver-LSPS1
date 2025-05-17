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
    
    // Process channel options using the combined LspManager 
    this.options = window.LspManager.processChannelOptions(lspInfo);
    
    if (!this.options) {
      console.error("Failed to process channel options from LSP info");
      return false;
    }
    
    // Initialize the LSP API Service with the LSP URL
    window.LspApiService.init(lspUrl);
    
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
      
      const response = await window.LspApiService.createOrder(this.nodePublicKey, channelSize, isPrivate);
      
      if (response.success && response.data) {
        // Extract order details following LSPS1 spec
        const orderId = response.data.order_id;
        let paymentInfo = null;
        
        // Get payment info from bolt11 payment option if available
        if (response.data.payment && response.data.payment.bolt11) {
          const bolt11Data = response.data.payment.bolt11;
          paymentInfo = {
            invoice: bolt11Data.invoice,
            expiresAt: bolt11Data.expires_at,
            feeSats: bolt11Data.fee_total_sat,
            totalSats: bolt11Data.order_total_sat
          };
        }
        
        // Set the current order ID for status polling
        this.currentOrderId = orderId;
        
        return {
          success: true,
          orderId: orderId,
          paymentInfo: paymentInfo,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.error || "Failed to create channel order",
          details: response.details
        };
      }
    } catch (error) {
      console.error("Error in createOrder:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Poll for order status
  startOrderStatusPolling(orderId) {
    if (!orderId) {
      console.error("Cannot start polling without order ID");
      return false;
    }
    
    // Store the order ID
    this.currentOrderId = orderId;
    
    // Clear any existing polling interval
    this.stopOrderStatusPolling();
    
    // Start polling for status every 5 seconds
    this.orderPollingInterval = setInterval(async () => {
      try {
        const status = await this.checkOrderStatus(orderId);
        
        // Dispatch status update event
        if (status.success) {
          if (window.OrderResult && window.OrderResult.updateStatus) {
            window.OrderResult.updateStatus(status);
          }
          
          // Check if we should stop polling
          if (status.status === 'complete' || status.status === 'failed') {
            console.log(`Order ${status.status}, stopping status polling`);
            this.stopOrderStatusPolling();
          }
        } else {
          console.warn("Order status check failed:", status.error);
        }
      } catch (error) {
        console.error("Error checking order status:", error);
      }
    }, 5000);
    
    // Initial immediate status check
    this.checkOrderStatus(orderId).then(status => {
      if (status.success && window.OrderResult && window.OrderResult.updateStatus) {
        window.OrderResult.updateStatus(status);
      }
    });
    
    return true;
  },
  
  // Stop polling for order status
  stopOrderStatusPolling() {
    if (this.orderPollingInterval) {
      clearInterval(this.orderPollingInterval);
      this.orderPollingInterval = null;
    }
  },
  
  // Check the status of an order
  async checkOrderStatus(orderId) {
    try {
      return await window.LspApiService.getOrderStatus(orderId);
    } catch (error) {
      console.error("Error checking order status:", error);
      return { success: false, error: error.message };
    }
  }
};