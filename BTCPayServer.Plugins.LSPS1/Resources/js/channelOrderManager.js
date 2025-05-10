/**
 * Channel Order Manager - Handles channel size selection and order creation
 */
const ChannelOrderManager = {
    // Default channel size if LSP doesn't specify
    defaultChannelSize: 1000000,
    
    /**
     * Initialize the Channel Order Manager
     */
    init: function(lspInfo) {
      console.log("Channel Order Manager initialized");
      
      this.setupSlider(lspInfo);
      this.setupPublicKeyValidation();
      this.setupOrderButton();
    },
    
    /**
     * Configure the channel size slider based on LSP info
     */
    setupSlider: function(lspInfo) {
      const slider = document.getElementById('channel-size-slider');
      const display = document.getElementById('channel-size-display');
      
      if (!slider || !display) return;
      
      // Set min/max from LSP info or defaults
      const minSize = lspInfo?.min_initial_lsp_balance_sat ? 
        parseInt(lspInfo.min_initial_lsp_balance_sat) : 150000;
      
      const maxSize = lspInfo?.max_initial_lsp_balance_sat ? 
        parseInt(lspInfo.max_initial_lsp_balance_sat) : 16000000;
      
      // Configure the slider
      slider.min = minSize;
      slider.max = maxSize;
      slider.step = 10000; // 10k sat increments
      slider.value = Math.min(Math.max(this.defaultChannelSize, minSize), maxSize);
      
      // Update display on input
      this.updateSizeDisplay(slider, display);
      slider.addEventListener('input', () => this.updateSizeDisplay(slider, display));
    },
    
    /**
     * Update the channel size display
     */
    updateSizeDisplay: function(slider, display) {
      if (!slider || !display) return;
      display.textContent = new Intl.NumberFormat().format(slider.value) + " sats";
    },
    
    /**
     * Set up public key validation
     */
    setupPublicKeyValidation: function() {
      const publicKeyInput = document.getElementById('node-public-key');
      const validation = document.getElementById('node-key-validation');
      const orderButton = document.getElementById('get-price-button');
      
      if (!publicKeyInput || !orderButton) return;
      
      publicKeyInput.addEventListener('input', () => {
        const publicKey = publicKeyInput.value.trim();
        const isValid = /^[0-9a-fA-F]{66}$/.test(publicKey);
        
        if (validation) {
          validation.textContent = publicKey === '' ? '' : 
            (isValid ? 'Valid node public key' : 'Invalid public key format');
          validation.className = 'form-text ' + 
            (publicKey === '' ? '' : (isValid ? 'text-success' : 'text-danger'));
        }
        
        orderButton.disabled = !isValid;
      });
    },
    
    /**
     * Set up order button functionality
     */
    setupOrderButton: function() {
      const orderButton = document.getElementById('get-price-button');
      const resultDiv = document.getElementById('order-result');
      
      if (!orderButton) return;
      
      orderButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        const publicKey = document.getElementById('node-public-key').value.trim();
        const slider = document.getElementById('channel-size-slider');
        const channelSize = slider ? parseInt(slider.value) : this.defaultChannelSize;
        const selectedLspSlug = document.getElementById('selected-lsp-slug').value;
        
        this.createOrder(selectedLspSlug, publicKey, channelSize, resultDiv);
      });
    },
    
    /**
     * Create an order with the selected LSP
     */
    createOrder: function(lspSlug, publicKey, channelSize, resultDiv) {
      const orderButton = document.getElementById('get-price-button');
      
      // Show loading state
      if (orderButton) {
        orderButton.disabled = true;
        orderButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Getting Price...';
      }
      
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div class="alert alert-info">
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Requesting price from LSP...
          </div>
        `;
      }
      
      // Get LSP URL based on slug
      const lspUrls = {
        'megalith-lsp': 'https://megalithic.me/api/lsps1/v1',
        'olympus-lsp': 'https://lsps1.lnolymp.us/api/v1',
        'flashsats-lsp': 'https://lsp.flashsats.xyz/api/v1'
      };
      
      const baseUrl = lspUrls[lspSlug];
      if (!baseUrl) {
        console.error(`Unknown LSP slug: ${lspSlug}`);
        if (resultDiv) {
          resultDiv.innerHTML = `<div class="alert alert-danger">Unknown LSP selected</div>`;
        }
        if (orderButton) {
          orderButton.disabled = false;
          orderButton.textContent = 'Get Price';
        }
        return;
      }
      
      // Create payload
      const payload = {
        lsp_balance_sat: channelSize.toString(),
        client_balance_sat: "0",
        required_channel_confirmations: 1, // No zero-conf
        funding_confirms_within_blocks: 6,
        channel_expiry_blocks: 13140,
        token: "btcpay-server-lsps1-plugin",
        announce_channel: false, // Always private
        public_key: publicKey
      };
      
      console.log("Creating order with:", payload);
      
      // Send request to LSP
      fetch(`${baseUrl}/create_order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => response.json())
      .then(data => {
        console.log("Order response:", data);
        this.displayOrderResult(data, resultDiv);
      })
      .catch(error => {
        console.error("Order creation failed:", error);
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="alert alert-danger">
              <strong>Error:</strong> Failed to contact LSP. Please try again.
            </div>
          `;
        }
      })
      .finally(() => {
        if (orderButton) {
          orderButton.disabled = false;
          orderButton.textContent = 'Get Price';
        }
      });
    },
    
    /**
     * Display the order result
     */
    displayOrderResult: function(data, resultDiv) {
      if (!resultDiv) return;
      
      if (data.error) {
        resultDiv.innerHTML = `
          <div class="alert alert-danger">
            <strong>Error:</strong> ${data.error.message || 'Unknown error'}
          </div>
        `;
        return;
      }
      
      if (!data.data) {
        resultDiv.innerHTML = `
          <div class="alert alert-warning">
            <strong>Warning:</strong> Received unexpected response format.
          </div>
        `;
        return;
      }
      
      const orderData = data.data;
      const btcAmount = (parseInt(orderData.total_sats) / 100000000).toFixed(8);
      
      resultDiv.innerHTML = `
        <div class="alert alert-success">
          <h5 class="mb-3">Channel Order Created</h5>
          <div class="mb-2"><strong>Price:</strong> ${new Intl.NumberFormat().format(orderData.total_sats)} sats (${btcAmount} BTC)</div>
          <div class="mb-2"><strong>Invoice:</strong></div>
          <div class="mb-3">
            <pre class="bg-dark text-light p-3 rounded overflow-auto">${orderData.payment_request}</pre>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <button id="copy-invoice-btn" class="btn btn-primary">
              Copy Invoice
            </button>
            <a href="lightning:${orderData.payment_request}" class="btn btn-secondary">
              Open in Wallet
            </a>
          </div>
        </div>
      `;
      
      // Set up copy functionality
      const copyBtn = document.getElementById('copy-invoice-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(orderData.payment_request)
            .then(() => {
              copyBtn.textContent = 'Copied!';
              setTimeout(() => copyBtn.textContent = 'Copy Invoice', 2000);
            });
        });
      }
    }
  };
  
  export default ChannelOrderManager;