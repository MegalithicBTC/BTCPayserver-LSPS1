// OrderResultInvoice.js - Utilities for rendering Lightning invoices
window.OrderResultInvoice = {
  /**
   * Renders a Lightning invoice with QR code
   * @param {string} invoice - The BOLT11 invoice to render
   * @returns {React.Element} - React element with the rendered invoice
   */
  renderInvoice: function(invoice) {
    // Generate lightning: URL for the invoice
    const lightningUrl = `lightning:${invoice}`;
    
    // Function to copy invoice to clipboard
    const copyToClipboard = () => {
      navigator.clipboard.writeText(invoice)
        .then(() => {
          // Create a toast notification element
          const toast = document.createElement('div');
          toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
          toast.setAttribute('role', 'alert');
          toast.setAttribute('aria-live', 'assertive');
          toast.setAttribute('aria-atomic', 'true');
          toast.style.zIndex = '1050';
          
          toast.innerHTML = `
            <div class="d-flex">
              <div class="toast-body">
                Invoice copied to clipboard!
              </div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
          `;
          
          document.body.appendChild(toast);
          
          // Use Bootstrap's toast API if available, otherwise just show/hide with timeout
          if (window.bootstrap && window.bootstrap.Toast) {
            const bsToast = new window.bootstrap.Toast(toast);
            bsToast.show();
          } else {
            toast.classList.add('show');
            setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => {
                document.body.removeChild(toast);
              }, 300);
            }, 3000);
          }
        })
        .catch(err => console.error('Failed to copy invoice:', err));
    };
    
    // Try to decode the invoice to show amount
    let amountSats = null;
    try {
      // Simple heuristic to extract amount from standard bolt11 invoice
      const amountMatch = invoice.match(/ln[a-z0-9]+([0-9]+)[a-z0-9]/i);
      if (amountMatch && amountMatch[1]) {
        amountSats = parseInt(amountMatch[1], 10);
      }
    } catch (e) {
      console.error("Error parsing invoice amount:", e);
    }
    
    return React.createElement('div', { className: 'mt-3 text-center' },
      React.createElement('h5', null, 'Pay this invoice to create your channel'),
      
      // QR code container with react-qr-code
      React.createElement('div', { 
        className: 'qr-container mb-3', 
        style: { 
          position: 'relative',
          display: 'inline-block',
          cursor: 'pointer',
          background: 'white',
          padding: '10px',
          borderRadius: '8px'
        },
        onClick: copyToClipboard
      },
        // Use the QRCodeSVG component from react-qr-code.js
        React.createElement(QRCodeSVG, {
          value: lightningUrl,
          size: 256,
          level: "L",
          bgColor: "#FFFFFF",
          fgColor: "#000000",
          includeMargin: true,
          style: {
            maxWidth: '100%',
            height: 'auto'
          }
        }),
        
        // Lightning bolt overlay
        React.createElement('div', {
          style: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px',
            height: '60px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }
        },
        React.createElement('img', {
          src: '/Resources/img/lightning-bolt.svg',
          alt: 'Lightning',
          style: {
            width: '40px',
            height: '40px'
          }
        }))
      ),
      
      // Show amount if available
      amountSats && React.createElement('p', { className: 'mb-3 fs-5' },
        `${amountSats.toLocaleString()} satoshis`
      ),
      
      // Copy button
      React.createElement('button', {
        className: 'btn btn-outline-primary me-2 mb-3',
        type: 'button',
        onClick: copyToClipboard
      }, 
      React.createElement('i', { className: 'bi bi-clipboard me-1' }),
      'Copy Invoice'),
      
      // Open in wallet button
      React.createElement('a', {
        href: lightningUrl,
        className: 'btn btn-primary mb-3',
        target: '_blank',
        rel: 'noopener noreferrer'
      }, 
      React.createElement('i', { className: 'bi bi-lightning-charge-fill me-1' }),
      'Open in Lightning Wallet')
    );
  }
};