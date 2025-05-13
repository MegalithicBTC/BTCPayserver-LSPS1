// OrderResult component - Displays channel order results
window.OrderResult = function(resultProps) {
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