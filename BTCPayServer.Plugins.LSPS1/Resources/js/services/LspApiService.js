// LspApiService - Direct communication with LSP API
window.LspApiService = {
  lspUrl: null,
  
  init(lspUrl) {
    if (!lspUrl) {
      console.error("LSP URL is required for API service initialization");
      return false;
    }
    
    this.lspUrl = lspUrl.trim().endsWith('/') ? lspUrl.trim() : lspUrl.trim() + '/';
    console.log("LSP API Service initialized with URL:", this.lspUrl);
    return true;
  },
  
  // Create an order directly with the LSP
  async createOrder(nodePublicKey, channelSizeInSats, isPrivateChannel = false) {
    if (!this.lspUrl || !nodePublicKey) {
      console.error("LSP URL and node public key are required for creating an order");
      return { success: false, error: "Missing required parameters" };
    }
    
    try {
      console.log(`Creating channel order directly with LSP for ${channelSizeInSats} sats, private: ${isPrivateChannel}`);
      
      // Build the order request data following the LSPS1 specification
      const payload = {
        node_pubkey: nodePublicKey,
        lsp_balance_sat: channelSizeInSats.toString(), // Convert to string for API
        client_balance_sat: "0",
        required_channel_confirmations: 1, // Standard (not zero-conf)
        funding_confirms_within_blocks: 6,
        channel_expiry_blocks: 13140,
        token: "btcpay-lsp-plugin",
        announce_channel: !isPrivateChannel // Public by default unless private is selected
      };
      
      // Post the order directly to the LSP
      const orderUrl = `${this.lspUrl}order`;
      console.log("Posting order to:", orderUrl);
      console.log("Order payload:", payload);
      
      const response = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      console.log("Raw LSP response:", responseText);
      
      // Try to parse the response as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse LSP response as JSON:", e);
        return { 
          success: false, 
          error: "Invalid response from LSP", 
          rawResponse: responseText 
        };
      }
      
      if (!response.ok) {
        console.error("LSP returned error:", result);
        return { 
          success: false, 
          error: result.error?.message || `Error ${response.status}: ${response.statusText}`,
          details: result 
        };
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("Error creating channel order with LSP:", error);
      return {
        success: false,
        error: error.message || "Failed to create channel order"
      };
    }
  },
  
  // Poll for order status directly from the LSP
  async getOrderStatus(orderId) {
    if (!this.lspUrl || !orderId) {
      console.error("LSP URL and order ID are required for checking order status");
      return { success: false, error: "Missing required parameters" };
    }
    
    try {
      const statusUrl = `${this.lspUrl}order/${orderId}`;
      console.log("Checking order status at:", statusUrl);
      
      const response = await fetch(statusUrl);
      
      if (!response.ok) {
        console.error(`Error polling order status: ${response.status}`);
        return { 
          success: false, 
          error: `Error ${response.status}: ${response.statusText}` 
        };
      }
      
      const result = await response.json();
      console.log("Order status from LSP:", result);
      
      // Map the state to a standard status
      let status = "processing";
      
      if (result.state) {
        const state = result.state.toUpperCase();
        status = state === "COMPLETED" || state === "SUCCESS" ? "complete" :
                state === "FAILED" || state === "ERROR" ? "failed" :
                state === "PAYMENT_PENDING" || state === "OPEN" ? "waiting_for_payment" :
                state === "PAID" || state === "PAYMENT_RECEIVED" ? "processing" :
                "processing";
      }
      
      return {
        success: true,
        status,
        orderId: result.order_id || orderId,
        channelId: result.channel_id,
        errorMessage: result.error_message,
        rawState: result.state,
        details: result
      };
    } catch (error) {
      console.error("Error checking order status with LSP:", error);
      return {
        success: false,
        error: error.message || "Failed to check order status"
      };
    }
  }
};