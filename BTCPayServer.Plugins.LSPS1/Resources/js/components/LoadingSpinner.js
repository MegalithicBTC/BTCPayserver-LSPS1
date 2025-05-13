// LoadingSpinner component
window.LoadingSpinner = function() {
  return React.createElement('div', { className: 'text-center my-5' },
    React.createElement('div', { className: 'spinner-border text-primary', role: 'status' }),
    React.createElement('p', { className: 'mt-3' }, 'Connecting to Lightning Service Provider...')
  );
};