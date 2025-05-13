document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById('lsps1-root');

  if (rootElement) {
    // Gather data from hidden inputs
    const props = {
      storeId: document.getElementById('store-id')?.value || '',
      xsrfToken: document.getElementById('request-verification-token')?.value || '',
      initialConnectionStatus: document.getElementById('is-connected')?.value || 'false',
      initialConnectionMessage: document.getElementById('connection-message')?.value || '',
      initialSelectedLspSlug: document.getElementById('selected-lsp-slug')?.value || '',
      initialConnectedLspName: document.getElementById('connected-lsp-name')?.value || '',
      initialLspInfoJson: document.getElementById('lsp-info-data')?.value || '{}',
      nodePublicKey: document.getElementById('node-public-key-value')?.textContent.trim() || '',
      availableLsps: Array.from(document.querySelectorAll('#available-lsps [data-lsp-slug]')).map(el => ({
        slug: el.dataset.lspSlug,
        name: el.dataset.lspName,
        selected: el.dataset.lspSelected === 'true'
      }))
    };

    // Create enhanced app with original functionality
    renderEnhancedApp(rootElement, props);
  }
});

// LSP Manager functionality (inspired by BEFORE-REACT-IGNORE/lspManager.js)
const LspManager = {
  lspInfo: null,
  
  init() {
    console.log("Initializing LSP Manager");
    // Try to load LSP info from data attribute or localStorage
    this.lspInfo = this.loadLspInfo();
  },
  
  loadLspInfo() {
    try {
      // First try to get from the hidden input
      const lspInfoElement = document.getElementById('lsp-info-data');
      if (lspInfoElement && lspInfoElement.value) {
        const parsedInfo = JSON.parse(lspInfoElement.value);
        
        // Save to localStorage for future page loads
        if (parsedInfo && Object.keys(parsedInfo).length > 0) {
          localStorage.setItem('lsps1_lsp_info', JSON.stringify(parsedInfo));
        }
        
        return parsedInfo;
      }
      
      // Fallback to localStorage
      const cachedInfo = localStorage.getItem('lsps1_lsp_info');
      if (cachedInfo) {
        return JSON.parse(cachedInfo);
      }
    } catch (error) {
      console.error("Error loading LSP info:", error);
    }
    
    return {};
  },
  
  // Process channel options
  processChannelOptions(lspInfo) {
    if (!lspInfo || !lspInfo.options) return null;
    
    const options = lspInfo.options;
    
    // Calculate min, max, and default values
    const minSats = options.minimal_channel_size || 100000;
    const maxSats = options.maximal_channel_size || 10000000;
    const defaultSats = Math.min(Math.max(1000000, minSats), maxSats);
    
    return {
      minSats,
      maxSats,
      defaultSats,
      minFeeSats: options.minimal_channel_fee || 0,
      maxFeeSats: options.maximal_channel_fee || 0,
      feeRate: options.channel_fee_rate || 0,
      requiresConfirmations: !!options.requires_confirmations
    };
  }
};

// Channel Order functionality (inspired by BEFORE-REACT-IGNORE/channelOrderManager.js)
const ChannelOrderManager = {
  lspInfo: null,
  options: null,
  
  init(lspInfo) {
    this.lspInfo = lspInfo;
    this.options = LspManager.processChannelOptions(lspInfo);
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

// Create an enhanced app that incorporates the original functionality
function renderEnhancedApp(container, props) {
  try {
    // Initialize managers
    LspManager.init();
    const lspInfo = LspManager.loadLspInfo();
    if (lspInfo && Object.keys(lspInfo).length > 0) {
      ChannelOrderManager.init(lspInfo);
    }
    
    // Create a LoadingSpinner component
    const LoadingSpinner = () => {
      return React.createElement('div', { className: 'text-center my-5' },
        React.createElement('div', { className: 'spinner-border text-primary', role: 'status' }),
        React.createElement('p', { className: 'mt-3' }, 'Connecting to Lightning Service Provider...')
      );
    };

    // Create a ConnectionFooter component
    const ConnectionFooter = (footerProps) => {
      const { connectionSuccessful, connectedLspName, availableLsps, storeId } = footerProps;
      
      // Create dropdown items if there are multiple LSPs
      let lspSelection = null;
      if (availableLsps && availableLsps.length > 1) {
        lspSelection = React.createElement('div', { className: 'mt-3' },
          React.createElement('p', null, 'Select Lightning Service Provider:'),
          React.createElement('select', { 
            className: 'form-select', 
            onChange: (e) => {
              window.location.href = `/stores/${storeId}/plugins/lsps1?selectedLsp=${e.target.value}`;
            }
          }, 
            availableLsps.map(lsp => 
              React.createElement('option', { 
                key: lsp.slug, 
                value: lsp.slug,
                selected: lsp.selected
              }, lsp.name)
            )
          )
        );
      }
      
      return React.createElement('div', { className: 'connection-footer mt-4' },
        React.createElement('div', { className: connectionSuccessful ? 'alert alert-success' : 'alert alert-warning' },
          connectionSuccessful 
            ? `Connected to ${connectedLspName}`
            : 'Not connected to any Lightning Service Provider'
        ),
        lspSelection
      );
    };

    // Create a ChannelSizeSlider component (inspired by channelSlider.js)
    const ChannelSizeSlider = (sliderProps) => {
      const { channelSize, setChannelSize, channelOptions } = sliderProps;
      
      // Calculate min, max values and step size
      const minSats = channelOptions?.minSats || 100000;
      const maxSats = channelOptions?.maxSats || 10000000;
      const step = Math.max(10000, Math.floor((maxSats - minSats) / 100));
      
      // Format sats as BTC or M sats based on size
      const formatAmount = (sats) => {
        if (sats >= 1000000) {
          return `${(sats / 1000000).toFixed(2)} M sats`;
        } else {
          return `${(sats).toLocaleString()} sats`;
        }
      };
      
      return React.createElement('div', { className: 'channel-size-slider mb-4' },
        React.createElement('label', { className: 'form-label' }, 
          'Channel Size: ', React.createElement('strong', null, formatAmount(channelSize))
        ),
        React.createElement('input', {
          type: 'range',
          className: 'form-range',
          min: minSats,
          max: maxSats,
          step: step,
          value: channelSize,
          onChange: (e) => setChannelSize(parseInt(e.target.value, 10))
        }),
        React.createElement('div', { className: 'd-flex justify-content-between' },
          React.createElement('small', null, formatAmount(minSats)),
          React.createElement('small', null, formatAmount(maxSats))
        )
      );
    };

    // Create an OrderResult component
    const OrderResult = (resultProps) => {
      const { result } = resultProps;
      
      if (!result) return null;
      
      if (result.success) {
        const paymentData = result.data;
        
        return React.createElement('div', { className: 'order-result mb-4' },
          React.createElement('div', { className: 'alert alert-success' },
            React.createElement('h5', null, 'Channel Order Created!'),
            React.createElement('p', null, 'Please make the payment to complete the channel setup.')
          ),
          React.createElement('div', { className: 'card mb-3' },
            React.createElement('div', { className: 'card-header' }, 'Payment Details'),
            React.createElement('div', { className: 'card-body' },
              React.createElement('p', null, 
                'Amount: ', 
                React.createElement('strong', null, `${paymentData.amount} sats`)
              ),
              paymentData.invoice && React.createElement('div', { className: 'mb-3' },
                React.createElement('label', { className: 'form-label' }, 'Lightning Invoice'),
                React.createElement('textarea', {
                  className: 'form-control',
                  rows: 3,
                  readOnly: true,
                  value: paymentData.invoice
                }),
                React.createElement('div', { className: 'mt-2' },
                  React.createElement('button', {
                    className: 'btn btn-sm btn-secondary',
                    onClick: () => navigator.clipboard.writeText(paymentData.invoice)
                  }, 'Copy Invoice')
                )
              )
            )
          )
        );
      } else {
        return React.createElement('div', { className: 'alert alert-danger' },
          React.createElement('h5', null, 'Error Creating Channel Order'),
          React.createElement('p', null, result.error || 'Unknown error occurred')
        );
      }
    };

    // Create a ChannelConfiguration component
    const ChannelConfiguration = (configProps) => {
      const { channelSize, setChannelSize, lspInfo, nodePublicKey, xsrfToken, setOrderResult } = configProps;
      
      // Get channel options from LSP info
      const channelOptions = LspManager.processChannelOptions(lspInfo);
      
      // Handle create channel button click
      const handleCreateChannel = async () => {
        if (!channelSize || !xsrfToken) {
          console.error("Missing required data for channel creation");
          return;
        }
        
        const result = await ChannelOrderManager.createOrder(channelSize, xsrfToken);
        setOrderResult(result);
      };
      
      return React.createElement('div', { className: 'card mb-4' },
        React.createElement('div', { className: 'card-header' }, 'Lightning Channel Configuration'),
        React.createElement('div', { className: 'card-body' },
          channelOptions && React.createElement(ChannelSizeSlider, {
            channelSize,
            setChannelSize,
            channelOptions
          }),
          React.createElement('p', null, 'Node Public Key: ', 
            React.createElement('code', { className: 'small' }, nodePublicKey || 'Not available')
          ),
          React.createElement('button', { 
            className: 'btn btn-primary', 
            type: 'button',
            onClick: handleCreateChannel
          }, 'Create Channel')
        )
      );
    };

    // Create the main app component
    function EnhancedApp() {
      const [loading, setLoading] = React.useState(true);
      const [connectionSuccessful, setConnectionSuccessful] = React.useState(props.initialConnectionStatus === 'true');
      const [connectionMessage, setConnectionMessage] = React.useState(props.initialConnectionMessage);
      const [connectedLspName, setConnectedLspName] = React.useState(props.initialConnectedLspName);
      const [lspInfo, setLspInfo] = React.useState(JSON.parse(props.initialLspInfoJson || '{}'));
      const [orderResult, setOrderResult] = React.useState(null);
      const [channelSize, setChannelSize] = React.useState(1000000);
      
      // Initialize app with LSP info
      React.useEffect(() => {
        console.log("Initializing enhanced LSPS1 App");
        
        const initialize = async () => {
          try {
            // If we already have LSP info, use it
            if (lspInfo && Object.keys(lspInfo).length > 0) {
              setLoading(false);
              return;
            }
            
            // Wait for LSP info with timeout
            let attempts = 0;
            const checkInterval = setInterval(() => {
              const updatedInfo = LspManager.loadLspInfo();
              if (updatedInfo && Object.keys(updatedInfo).length > 0) {
                console.log("LSP info loaded, showing UI");
                setLspInfo(updatedInfo);
                setLoading(false);
                clearInterval(checkInterval);
                ChannelOrderManager.init(updatedInfo);
              }
              
              attempts++;
              if (attempts > 20) { // 10 seconds (20 * 500ms)
                console.log("Loading timeout reached, showing UI regardless");
                setLoading(false);
                clearInterval(checkInterval);
              }
            }, 500);
          } catch (error) {
            console.error("Error initializing app:", error);
            setLoading(false);
          }
        };
        
        initialize();
      }, []);
      
      return React.createElement('div', { className: 'lsps1-container' },
        loading ? 
          React.createElement(LoadingSpinner) : 
          React.createElement(React.Fragment, null,
            React.createElement(ChannelConfiguration, {
              channelSize: channelSize,
              setChannelSize: setChannelSize,
              lspInfo: lspInfo,
              nodePublicKey: props.nodePublicKey,
              xsrfToken: props.xsrfToken,
              setOrderResult: setOrderResult
            }),
            
            orderResult && React.createElement(OrderResult, { result: orderResult })
          ),
        React.createElement(ConnectionFooter, {
          connectionSuccessful: connectionSuccessful,
          connectedLspName: connectedLspName,
          availableLsps: props.availableLsps,
          storeId: props.storeId
        })
      );
    }
    
    // Render the app using React 18's createRoot API
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(EnhancedApp));
    
    console.log("Enhanced LSPS1 app initialized successfully");
  } catch (error) {
    console.error("Error initializing LSPS1 application:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <strong>Error loading Lightning Channel interface</strong>
        <p>Please check the console for more information.</p>
      </div>
    `;
  }
}