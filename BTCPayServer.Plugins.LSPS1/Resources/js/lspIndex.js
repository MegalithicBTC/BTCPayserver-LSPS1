/**
 * LSPS1 Plugin - Frontend Functionality
 * Handles LSP selection and connection status
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("LSP Plugin script loaded");
  
  // Debug dropdown elements with updated selector
  const dropdownBtn = document.querySelector('#lspMenuButton');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  console.log("Dropdown button found:", !!dropdownBtn);
  console.log("Dropdown menu found:", !!dropdownMenu);
  
  // Set up event listeners for the LSP dropdown items
  setupLspSelectionHandlers();
  
  // Add manual dropdown toggle for testing
  if (dropdownBtn && dropdownMenu) {
    console.log("Setting up manual dropdown toggle");
    dropdownBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("Dropdown button clicked");
      dropdownMenu.classList.toggle('show');
      dropdownBtn.setAttribute('aria-expanded', dropdownMenu.classList.contains('show'));
    });
  }
});

/**
 * Attaches click handlers to all LSP selection options
 */
function setupLspSelectionHandlers() {
  // Find all LSP selection links in the dropdown
  const items = document.querySelectorAll('.dropdown-item[data-lsp-slug]');
  console.log("Found LSP dropdown items:", items.length);
  
  items.forEach(item => {
    item.addEventListener('click', handleLspSelection);
    console.log("Added click handler to:", item.textContent.trim());
  });
}

/**
 * Handles the LSP selection and connection process
 * @param {Event} e - The click event
 */
async function handleLspSelection(e) {
  e.preventDefault();
  console.log("LSP selection clicked");
  
  // Get necessary data
  const lspSlug = e.target.dataset.lspSlug;
  const storeId = document.getElementById("store-id").value;
  const token = document.getElementById("request-verification-token").value;
  const statusEl = document.getElementById("connection-status");
  
  console.log("Connecting to LSP:", lspSlug);
  
  // Update UI to show connecting state
  statusEl.innerHTML = '<i class="fa fa-circle-notch fa-spin me-1" style="font-size: 8px;"></i> Connecting...';
  
  try {
    // Send request to connect to the selected LSP
    console.log("Sending connection request...");
    const response = await fetch(`/stores/${storeId}/plugins/lsps1?lsp=${lspSlug}`, {
      method: 'GET',
      headers: { 
        'RequestVerificationToken': token
      }
    });
    
    if (response.ok) {
      // Success - reload the page to update status
      console.log("Connection successful, reloading page");
      window.location.reload();
    } else {
      // Error from server
      const errorText = await response.text();
      console.error("Error connecting to LSP:", errorText);
      statusEl.innerHTML = '<i class="fa fa-circle text-danger me-1" style="font-size: 8px;"></i> Connection failed';
    }
  } catch (err) {
    // Network or other error
    console.error("Error connecting to LSP:", err);
    statusEl.innerHTML = '<i class="fa fa-circle text-danger me-1" style="font-size: 8px;"></i> Connection error';
  }
}