/**
 * Channel Order Manager - Core functionality
 */
import ChannelSlider from './channelSlider.js';
import OrderCreator from './channelOrderCreator.js';

const ChannelOrderManager = {
    /**
     * Initialize the Channel Order Manager
     */
    init: function(lspInfo) {
      console.log("Channel Order Manager initialized");
      
      // Initialize slider component
      ChannelSlider.init(lspInfo);
      
      // Initialize order functionality
      OrderCreator.init();
      
      // Read node public key from div
      const nodePublicKeyElement = document.getElementById('node-public-key-value');
      if (nodePublicKeyElement) {
        const nodePublicKey = nodePublicKeyElement.textContent.trim();
        console.log("Loaded node public key:", nodePublicKey);
        
        // Enable order button if we have a node public key
        const orderButton = document.getElementById('get-price-button');
        if (orderButton && nodePublicKey) {
          orderButton.disabled = false;
        }
      } else {
        console.error("Could not find node public key element");
      }
    }
};

export default ChannelOrderManager;