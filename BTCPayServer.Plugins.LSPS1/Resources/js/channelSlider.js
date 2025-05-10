/**
 * Channel Size Slider - Manages the channel size slider UI
 */
const ChannelSlider = {
    // Default channel size if LSP doesn't specify
    defaultChannelSize: 1000000,
    // Hard floor for channel size - never allow below this value
    MINIMUM_CHANNEL_SIZE: 100000,
    
    /**
     * Initialize the slider component
     */
    init: function(lspInfo) {
        this.setupSlider(lspInfo);
    },
    
    /**
     * Configure the channel size slider based on LSP info
     */
    setupSlider: function(lspInfo) {
        const slider = document.getElementById('channel-size-slider');
        const display = document.getElementById('channel-size-display');
        
        if (!slider || !display) return;
        
        // Set min/max from LSP info or defaults with hard floor
        let minSize = lspInfo?.min_initial_lsp_balance_sat ? 
            parseInt(lspInfo.min_initial_lsp_balance_sat) : 150000;
        
        // Enforce hard floor of 100,000 sats regardless of what LSP reports
        minSize = Math.max(minSize, this.MINIMUM_CHANNEL_SIZE);
        
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
     * Get the current selected channel size
     */
    getCurrentSize: function() {
        const slider = document.getElementById('channel-size-slider');
        return slider ? parseInt(slider.value) : this.defaultChannelSize;
    }
};

export default ChannelSlider;