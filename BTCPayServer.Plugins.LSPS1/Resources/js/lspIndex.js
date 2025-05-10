/**
 * LSPS1 Plugin - Frontend Entry Point
 */
import LspManager from './lspManager.js';
import ChannelOrderManager from './channelOrderManager.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("LSP Plugin loading...");
  
  // Get references to loading spinner and channel configuration
  const loadingSpinner = document.getElementById('loading-spinner');
  const channelConfig = document.getElementById('channel-configuration');
  
  // Initialize the LSP Manager first
  LspManager.init();
  
  // Get LSP info from the server-provided data or cached value
  const lspInfo = LspManager.loadLspInfo();
  
  // Check if we already have LSP info
  if (lspInfo && Object.keys(lspInfo).length > 0) {
    console.log("LSP info available immediately, showing UI");
    hideSpinner();
    ChannelOrderManager.init(lspInfo);
  } else {
    console.log("Waiting for LSP info to load...");
    
    // Start checking for data every 500ms
    const checkInterval = setInterval(() => {
      const updatedInfo = LspManager.loadLspInfo();
      if (updatedInfo && Object.keys(updatedInfo).length > 0) {
        console.log("LSP info loaded, showing UI");
        hideSpinner();
        clearInterval(checkInterval);
        ChannelOrderManager.init(updatedInfo);
      }
    }, 500);
    
    // Failsafe - show UI after 10 seconds even if data hasn't loaded
    setTimeout(() => {
      console.log("Loading timeout reached, showing UI regardless of data state");
      hideSpinner();
      clearInterval(checkInterval);
      // Initialize with whatever data we have, even if it's empty
      ChannelOrderManager.init(LspManager.loadLspInfo() || {});
    }, 10000);
  }
  
  // Function to hide spinner and show configuration
  function hideSpinner() {
    if (loadingSpinner) loadingSpinner.classList.add('d-none');
    if (channelConfig) channelConfig.classList.remove('d-none');
  }
  
  // LSP dropdown menu handling
  const dropdownBtn = document.getElementById('lsps1MenuButton');
  const dropdownMenu = document.querySelector('[aria-labelledby="lsps1MenuButton"]');
  
  if (dropdownBtn && dropdownMenu) {
    // Prevent button click from triggering other dropdowns
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
    });
    
    // Handle LSP selection from dropdown
    const lspLinks = dropdownMenu.querySelectorAll('[data-lsp-slug]');
    lspLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const slug = this.getAttribute('data-lsp-slug');
        if (slug) {
          // Show loading spinner while changing LSP
          if (loadingSpinner) loadingSpinner.classList.remove('d-none');
          if (channelConfig) channelConfig.classList.add('d-none');
          
          // Redirect to new LSP
          window.location.href = `?lsp=${slug}`;
        }
      });
    });
    
    // Prevent clicks within dropdown menu from closing it
    dropdownMenu.addEventListener('click', function(e) {
      // Only stop propagation if it's not one of our LSP action links
      if (!e.target.hasAttribute('data-lsp-slug')) {
        e.stopPropagation();
      }
    });
  }
});