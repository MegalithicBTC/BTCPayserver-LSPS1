/**
 * LSPS1 Plugin - Frontend Entry Point
 */
import LspManager from './lspManager.js';
import ChannelOrderManager from './channelOrderManager.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("LSP Plugin loading...");
  
  // Initialize the LSP Manager first
  LspManager.init();
  
  // Get LSP info from the manager to pass to the Channel Order Manager
  const lspInfo = LspManager.loadLspInfo();
  
  // Initialize the Channel Order Manager with the LSP info
  ChannelOrderManager.init(lspInfo);
  
  // Keep existing dropdown handler logic
  const dropdownBtn = document.getElementById('lsps1MenuButton');
  const dropdownMenu = document.querySelector('[aria-labelledby="lsps1MenuButton"]');
  
  if (dropdownBtn && dropdownMenu) {
    // Prevent button click from triggering other dropdowns
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
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