// ChannelSizeSlider component - For selecting channel size
window.ChannelSizeSlider = function(props) {
  const { 
    channelSize, 
    setChannelSize,
    options,
    disabled
  } = props;
  
  // Parse options with fallbacks to ensure the slider always has valid values
  const minSats = options && options.minSats ? parseInt(options.minSats, 10) : 150000; // Min 150k sats fallback (min_initial_lsp_balance_sat)
  const maxSats = options && options.maxSats ? parseInt(options.maxSats, 10) : 16000000; // 16M sats fallback (max_initial_lsp_balance_sat)
  
  // Default to 1M sats if no channel size is provided or if it's outside the valid range
  const defaultChannelSize = 1000000;
  const initialChannelSize = channelSize || defaultChannelSize;
  
  // Ensure the current channelSize respects min/max bounds
  const validChannelSize = Math.min(Math.max(initialChannelSize, minSats), maxSats);
  
  // Calculate steps for the slider - we want to show reasonable increments
  const range = maxSats - minSats;
  
  // Use a more granular step size calculation
  // We'll aim for roughly 100-200 steps across the range for smooth sliding
  let step = Math.max(10000, Math.floor(range / 150)); // At least 10k sats
  
  // Round to a nice number for better UX
  const magnitude = Math.pow(10, Math.floor(Math.log10(step)));
  step = Math.round(step / magnitude) * magnitude;
  
  // Debounce high-frequency events when sliding
  const [displaySize, setDisplaySize] = React.useState(validChannelSize);
  
  // Keep local state in sync with parent's channelSize
  React.useEffect(() => {
    setDisplaySize(validChannelSize);
  }, [validChannelSize]);
  
  // Format a number of satoshis into a human-readable string
  const formatSats = (sats) => {
    const num = Number(sats);
    if (isNaN(num)) return "0 sats";
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M sats";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k sats";
    }
    
    return num + " sats";
  };
  
  // Convert satoshis to BTC with clean formatting
  const satsToBtc = (sats) => {
    const btcValue = sats / 100000000;
    
    // Format with appropriate number of decimals based on magnitude
    if (btcValue >= 0.1) {
      return btcValue.toFixed(3);
    } else if (btcValue >= 0.01) {
      return btcValue.toFixed(4);
    } else if (btcValue >= 0.001) {
      return btcValue.toFixed(5);
    } else {
      return btcValue.toFixed(6);
    }
  };
  
  // Handle slider change
  const handleSliderChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setDisplaySize(newSize);
    setChannelSize(newSize);
  };
  
  // Handle text input change
  const handleInputChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const newSize = parseInt(rawValue, 10);
    
    if (!isNaN(newSize)) {
      const boundedSize = Math.min(Math.max(newSize, minSats), maxSats);
      setDisplaySize(boundedSize);
      setChannelSize(boundedSize);
    }
  };
  
  return React.createElement('div', { className: 'channel-size-slider-container' },
    React.createElement('div', { className: 'slider-header' },
      React.createElement('label', { htmlFor: 'channel-size-slider' }, 'Channel Size:'),
      React.createElement('div', { className: 'slider-value' },
        React.createElement('input', {
          type: 'text',
          className: 'form-control',
          value: displaySize.toLocaleString(),
          onChange: handleInputChange,
          disabled: disabled
        }),
        React.createElement('span', { className: 'slider-units text-muted' }, 
          `satoshis (${satsToBtc(displaySize)} BTC)`
        )
      )
    ),
    
    React.createElement('div', { className: 'slider-wrapper' },
      React.createElement('input', {
        id: 'channel-size-slider',
        type: 'range',
        className: 'form-range btcpay-input-range',
        min: minSats,
        max: maxSats,
        step: step,
        value: displaySize,
        onChange: handleSliderChange,
        disabled: disabled
      })
    )
  );
};