// ChannelSizeSlider component - Allows users to select channel size
window.ChannelSizeSlider = function(sliderProps) {
  const { channelSize, setChannelSize, channelOptions, defaultValue = 1000000 } = sliderProps;
  
  // Initialize with default value if needed
  React.useEffect(() => {
    if (channelSize === 0 && setChannelSize) {
      setChannelSize(defaultValue);
    }
  }, []);
  
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