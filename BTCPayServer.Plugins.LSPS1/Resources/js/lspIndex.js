/**
 * LSPS1 Plugin - Frontend Entry Point
 */
import LspManager from './lspManager.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("LSP Plugin loading...");
  
  // Initialize the LSP Manager
  LspManager.init();
  
  // Prevent dropdown from affecting other elements
  const dropdownBtn = document.getElementById('lsps1MenuButton');
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
});