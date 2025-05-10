/**
 * Channel Order Creator - Handles creating orders and displaying results
 */
import ChannelSlider from './channelSlider.js';

const OrderCreator = {
    /**
     * Initialize the order creator
     */
    init: function() {
        this.setupOrderButton();
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
            
            // Get public key from div element
            const publicKeyElement = document.getElementById('node-public-key-value');
            const publicKey = publicKeyElement ? publicKeyElement.textContent.trim() : '';
            
            console.log("Using node public key:", publicKey);
            
            // Get channel size from slider
            const channelSize = ChannelSlider.getCurrentSize();
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
        
        // Make request
        fetch(`${baseUrl}/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`LSP responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Order response:", data);
            this.displayOrderResult(data, resultDiv);
        })
        .catch(error => {
            console.error("Error creating order:", error);
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Error:</strong> ${error.message}
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
     * Display order result in the UI
     */
    displayOrderResult: function(data, resultDiv) {
        if (!resultDiv) return;
        
        if (!data.payment_request) {
            resultDiv.innerHTML = `
                <div class="alert alert-warning">
                    <strong>Error:</strong> LSP did not return a payment request
                </div>
            `;
            return;
        }
        
        // Format the fee amount
        const feeAmount = parseInt(data.fee_total_sat).toLocaleString();
        
        resultDiv.innerHTML = `
            <div class="card border-success">
                <div class="card-header bg-success text-white">
                    <h3 class="h5 mb-0">Channel Purchase Ready</h3>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="mb-2">
                            <span class="fw-bold">Fee:</span>
                            <span>${feeAmount} sats</span>
                        </div>
                        <div class="mb-2">
                            <span class="fw-bold">Expires:</span>
                            <span>${new Date(data.expires_at).toLocaleString()}</span>
                        </div>
                    </div>

                    <div class="mb-3">
                        <div class="input-group">
                            <input type="text" class="form-control" value="${data.payment_request}" readonly id="invoice-copy-input">
                            <button class="btn btn-outline-secondary" type="button" 
                                    onclick="navigator.clipboard.writeText('${data.payment_request}')
                                            .then(() => alert('Invoice copied to clipboard'))">
                                Copy
                            </button>
                        </div>
                        <small class="text-muted">Pay this invoice to open the channel</small>
                    </div>

                    <div class="text-center">
                        <div class="qr-container" id="invoice-qr"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Generate QR code for invoice
        if (typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById("invoice-qr"), {
                text: data.payment_request,
                width: 220,
                height: 220
            });
        }
    }
};

export default OrderCreator;