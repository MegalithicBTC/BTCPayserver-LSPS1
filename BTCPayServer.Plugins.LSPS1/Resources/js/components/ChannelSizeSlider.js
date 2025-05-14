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
  
  // Calculate fee if options include a fee rate
  const calculateFee = () => {
    if (!options || typeof options.feeRatePercent !== 'number') return null;
    
    const fee = Math.round(validChannelSize * options.feeRatePercent / 100);
    return fee;
  };
  
  const fee = calculateFee();
  
  return React.createElement('div', { className: 'channel-size-slider-container' },
    React.createElement('div', { className: 'slider-header' },
      React.createElement('label', { htmlFor: 'channel-size-slider' }, 'Channel Size:'),
      React.createElement('div', { className: 'slider-value' },
        React.createElement('input', {
          type: 'text',
          className: 'form-control',
          value: displaySize,
          onChange: handleInputChange,
          disabled: disabled
        }),
        React.createElement('span', { className: 'slider-units' }, 'sats')
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
    ),
    
    // Show min and max labels
    React.createElement('div', { className: 'd-flex justify-content-between mt-1' },
      React.createElement('small', { className: 'text-muted' }, formatSats(minSats)),
      React.createElement('small', { className: 'text-muted' }, formatSats(maxSats))
    ),
    
    // Show fee information if available
    fee !== null && React.createElement('div', { className: 'fee-info mt-2' },
      React.createElement('small', null, 
        `Channel Opening Fee: ${formatSats(fee)} (${options.feeRatePercent.toFixed(2)}%)`
      )
    )
  );
};