// Channel Order Manager - Handles channel order creation
window.ChannelOrderManager = {
  lspInfo: null,
  options: null,
  
  init(lspInfo) {
    this.lspInfo = lspInfo;
    this.options = window.LspManager.processChannelOptions(lspInfo);
    console.log("Channel Order Manager initialized with options:", this.options);
  },
  
  // Create an order with the specified channel size
  async createOrder(channelSize, xsrfToken) {
    if (!this.lspInfo || !this.options) {
      console.error("Cannot create order: LSP info or options not available");
      return { success: false, error: "LSP information not available" };
    }
    
    try {
      console.log(`Creating channel order for ${channelSize} sats`);
      
      // Build the order request data
      const data = {
        channelSizeInSats: channelSize,
        __RequestVerificationToken: xsrfToken
      };
      
      // Post the order to the server
      const response = await fetch(window.location.pathname + '/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Order creation result:", result);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("Error creating channel order:", error);
      return {
        success: false,
        error: error.message || "Failed to create channel order"
      };
    }
  }
};