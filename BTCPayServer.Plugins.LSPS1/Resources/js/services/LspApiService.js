// LspApiService - Direct communication with LSP API
window.LspApiService = {
  lspUrl: null,
  
  init(lspUrl) {
    if (!lspUrl) {
      console.error("LSP URL is required for API service initialization");
      return false;
    }
    
    // Normalize the URL to ensure it ends with a slash
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
        public_key: nodePublicKey, // Changed from node_pubkey to public_key to match API requirements
        lsp_balance_sat: channelSizeInSats.toString(), // Convert to string for API
        client_balance_sat: "0",
        required_channel_confirmations: 1, // Standard (not zero-conf)
        funding_confirms_within_blocks: 6,
        channel_expiry_blocks: 13140,
        token: "btcpay-lsp-plugin",
        announce_channel: !isPrivateChannel // Public by default unless private is selected
      };
      
      // For LSPS1 API, we directly append the endpoint to the base URL which ends with /v1
      const baseUrl = this.lspUrl.endsWith('/') ? this.lspUrl : this.lspUrl + '/';
      const orderUrl = `${baseUrl}create_order`;
      
      console.log("Posting order to:", orderUrl);
      console.log("Order payload:", payload);
      
      // Use a timeout for the fetch operation to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(orderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
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
          
          // Handle specific LSPS1 error codes
          let errorMessage = "";
          if (result.error) {
            // Standard JSON-RPC error
            if (result.error.code === -32602) {
              const property = result.error.data?.property;
              const message = result.error.data?.message || 'Invalid parameters';
              errorMessage = property ? `Invalid parameter: ${property} - ${message}` : message;
            }
            // LSPS1 specific error codes
            else if (result.error.code === 1) {
              errorMessage = `Client rejected: ${result.error.data?.message || 'Your request was rejected by the LSP'}`;
            }
            else if (result.error.code === 100) {
              const property = result.error.data?.property;
              errorMessage = property 
                ? `Option mismatch for ${property}: ${result.error.data?.message || 'The requested values don\'t match LSP requirements'}`
                : `Option mismatch: ${result.error.data?.message || 'The requested values don\'t match LSP requirements'}`;
            }
            else if (result.error.code === 101) {
              errorMessage = "Order not found";
            }
            else {
              // Generic error handling with code if available
              errorMessage = result.error.message || 
                           (result.error.code ? `Error code ${result.error.code}` : `Error ${response.status}: ${response.statusText}`);
            }
          } else {
            // Fallback for non-standard error responses
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          
          return { 
            success: false, 
            error: errorMessage,
            details: result 
          };
        }
        
        return {
          success: true,
          data: result
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error("Request to LSP timed out after 30 seconds");
          return {
            success: false,
            error: "Request to LSP timed out. Please try again."
          };
        }
        throw fetchError; // Re-throw to be caught by outer try/catch
      }
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
      const baseUrl = this.lspUrl.endsWith('/') ? this.lspUrl : this.lspUrl + '/';
      const statusUrl = `${baseUrl}get_order?order_id=${orderId}`;
      
      console.log("Checking order status at:", statusUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(statusUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Error polling order status: ${response.status}`);
          
          let errorMessage = `Error ${response.status}: ${response.statusText}`;
          
          // Try to parse the response to get a more detailed error message
          try {
            const errorResult = await response.json();
            
            // Handle specific LSPS1 error codes
            if (errorResult.error) {
              // JSON-RPC standard error
              if (errorResult.error.code === -32602) {
                errorMessage = `Invalid parameter: ${errorResult.error.data?.message || 'The request contains invalid parameters'}`;
              }
              // LSPS1 specific - Order not found
              else if (errorResult.error.code === 101) {
                errorMessage = "Order not found";
              }
              else {
                errorMessage = errorResult.error.message || errorMessage;
              }
            }
          } catch (e) {
            // If we can't parse the response, just use the generic error
            console.error("Failed to parse error response:", e);
          }
          
          return { 
            success: false, 
            error: errorMessage
          };
        }
        
        const result = await response.json();
        console.log("Order status from LSP:", result);
        
        // Check for COMPLETED state first
        const isCompleted = result.order_state === "COMPLETED";
        let orderStatus = isCompleted ? "complete" :
                       result.order_state === "FAILED" ? "failed" :
                       result.order_state === "CREATED" ? "waiting_for_payment" :
                       "processing";
        
        // Get payment state information
        let paymentInfo = null;
        if (result.payment && result.payment.bolt11) {
          // Check for Lightning payment (bolt11)
          const bolt11State = result.payment.bolt11.state?.toUpperCase();
          
          paymentInfo = {
            type: 'lightning',
            state: bolt11State,
            expiresAt: result.payment.bolt11.expires_at,
            invoice: result.payment.bolt11.invoice,
            feeSats: result.payment.bolt11.fee_total_sat,
            totalSats: result.payment.bolt11.order_total_sat
          };
          
          // Update status based on payment state
          if (bolt11State === 'EXPECT_PAYMENT') {
            orderStatus = 'waiting_for_payment';
          } else if (bolt11State === 'HOLD') {
            orderStatus = 'payment_received';
          } else if (bolt11State === 'PAID') {
            orderStatus = 'processing';
          } else if (bolt11State === 'REFUNDED' || bolt11State === 'CANCELLED') {
            orderStatus = 'failed';
            paymentInfo.refundReason = 'Payment was cancelled or refunded';
          }
        }
        
        // Enhanced channel information
        let channelInfo = null;
        if (result.channel) {
          channelInfo = {
            fundedAt: result.channel.funded_at,
            fundingOutpoint: result.channel.funding_outpoint,
            expiresAt: result.channel.expires_at,
            channelId: result.channel.channel_id,
            state: result.channel.state
          };
        }
        
   
        return {
          success: true,
          status: orderStatus,
          order_state: result.order_state, // Include raw order_state
          orderId: result.order_id || orderId,
          paymentInfo,
          channelInfo,
          details: result
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error("Request to LSP timed out after 10 seconds");
          return {
            success: false,
            error: "Request to LSP timed out. Please try again."
          };
        }
        throw fetchError; // Re-throw to be caught by outer try/catch
      }
    } catch (error) {
      console.error("Error checking order status with LSP:", error);
      return {
        success: false,
        error: error.message || "Failed to check order status"
      };
    }
  }
};